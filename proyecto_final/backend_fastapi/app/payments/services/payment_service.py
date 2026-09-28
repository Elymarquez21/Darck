from datetime import datetime, timezone
import hashlib
import json
import logging
import secrets
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.payments.core.config import payment_settings
from app.payments.exceptions import IdempotencyConflictException, PaymentNotFoundException, PaymentProviderException
from app.payments.models.payment import (
    Payment,
    PaymentProvider as PaymentProviderType,
    PaymentStatus,
    PaymentWebhookEvent,
)
from app.payments.repositories.payment_repository import PaymentRepository
from app.payments.schemas.payment import PaymentCreate
from app.payments.services.payment_factory import payment_provider

logger = logging.getLogger("payments.service")

ALLOWED_TRANSITIONS = {
    PaymentStatus.PENDING: {
        PaymentStatus.APPROVED,
        PaymentStatus.DECLINED,
        PaymentStatus.VOIDED,
        PaymentStatus.ERROR,
        PaymentStatus.EXPIRED,
    },
    PaymentStatus.APPROVED: {PaymentStatus.VOIDED},
    PaymentStatus.DECLINED: set(),
    PaymentStatus.VOIDED: set(),
    PaymentStatus.ERROR: set(),
    PaymentStatus.EXPIRED: set(),
}


def transition_payment(payment: Payment, new_status: PaymentStatus) -> bool:
    if payment.status is new_status or new_status not in ALLOWED_TRANSITIONS[payment.status]:
        return False
    payment.status = new_status
    payment.updated_at = datetime.now(timezone.utc)
    return True


def _reference() -> str:
    return f"IAZY-{datetime.now(timezone.utc):%Y%m%d}-{secrets.token_hex(6).upper()}"


def _wompi_status(value: str) -> PaymentStatus:
    try:
        return {
            "PENDING": PaymentStatus.PENDING,
            "APPROVED": PaymentStatus.APPROVED,
            "DECLINED": PaymentStatus.DECLINED,
            "FAILED": PaymentStatus.DECLINED,
            "VOIDED": PaymentStatus.VOIDED,
            "ERROR": PaymentStatus.ERROR,
            "EXPIRED": PaymentStatus.EXPIRED,
        }[value.upper()]
    except KeyError as exc:
        raise PaymentProviderException("Wompi devolvió un estado de transacción no reconocido") from exc


def _fingerprint(data: PaymentCreate) -> str:
    encoded = json.dumps(data.model_dump(mode="json"), sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _webhook_hash(payload: dict, checksum: str | None) -> str:
    if checksum:
        return hashlib.sha256(checksum.lower().encode()).hexdigest()
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def _safe_provider_data(value):
    sensitive_keys = {
        "token", "cvv", "cvc", "security_code", "card_number", "cardnumber", "authorization",
        "private_key", "secret", "account_number", "accountnumber", "number",
    }
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if key.lower().replace("-", "_") in sensitive_keys else _safe_provider_data(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_safe_provider_data(item) for item in value]
    return value


class PaymentService:
    def __init__(self, session: AsyncSession):
        self.repo = PaymentRepository(session)
        self.session = session

    async def create(self, data: PaymentCreate, idempotency_key: str | None = None) -> Payment:
        provider = payment_provider(data.provider)
        fingerprint = _fingerprint(data) if idempotency_key else None
        stored_idempotency_key = hashlib.sha256(idempotency_key.encode()).hexdigest() if idempotency_key else None
        if idempotency_key:
            previous = await self.repo.by_idempotency_key(stored_idempotency_key)
            if previous:
                self._validate_idempotent_replay(previous, fingerprint)
                self._log("idempotent_replay", previous, result="existing")
                return previous

        payment = Payment(
            reference=_reference(),
            idempotency_key=stored_idempotency_key,
            request_fingerprint=fingerprint,
            provider=data.provider,
            amount=data.amount,
            currency=data.currency,
            status=PaymentStatus.PENDING,
            customer_email=str(data.customer_email),
            customer_name=data.customer_name,
            description=data.description,
            redirect_url=payment_settings.app_url,
        )
        try:
            await self.repo.add(payment)
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            if not idempotency_key:
                raise
            previous = await self.repo.by_idempotency_key(stored_idempotency_key)
            if not previous:
                raise
            self._validate_idempotent_replay(previous, fingerprint)
            return previous

        self._log("payment_created", payment, result="pending")
        try:
            result = await provider.create_payment(
                amount=payment.amount,
                currency=payment.currency,
                reference=payment.reference,
                email=payment.customer_email,
                name=payment.customer_name,
                redirect_url=payment.redirect_url,
            )
        except PaymentProviderException as exc:
            payment.raw_response = {"error": exc.code}
            transition_payment(payment, PaymentStatus.ERROR)
            await self.session.commit()
            self._log("provider_create_failed", payment, result="error", error_code=exc.code)
            raise
        payment.provider_transaction_id = result.get("transaction_id")
        payment.checkout_url = result.get("checkout_url")
        payment.raw_response = _safe_provider_data(result.get("raw_response"))
        await self.session.commit()
        self._log("checkout_created", payment, result="success")
        return payment

    @staticmethod
    def _validate_idempotent_replay(payment: Payment, fingerprint: str | None) -> None:
        if payment.request_fingerprint != fingerprint:
            raise IdempotencyConflictException()

    async def get(self, payment_id: UUID) -> Payment | None:
        return await self.repo.by_id(payment_id)

    async def get_by_reference(self, reference: str) -> Payment | None:
        return await self.repo.by_reference(reference)

    async def sync(self, payment_id: UUID) -> Payment:
        payment = await self.repo.by_id(payment_id)
        if not payment:
            raise PaymentNotFoundException()
        if not payment.provider_transaction_id:
            raise PaymentProviderException("Wompi aún no ha asignado un ID; espera el webhook de checkout")
        transaction = await payment_provider(payment.provider).get_payment(payment.provider_transaction_id)
        provider_response = transaction.pop("_provider_response", transaction)
        self._apply_provider_transaction(payment, transaction)
        payment.raw_response = _safe_provider_data(provider_response)
        await self.session.commit()
        self._log("payment_synchronized", payment, result="success")
        return payment

    async def refund(self, payment_id: UUID) -> Payment:
        payment = await self.repo.by_id(payment_id)
        if not payment:
            raise PaymentNotFoundException()
        if not payment.provider_transaction_id:
            raise PaymentProviderException("El proveedor todavía no asigna un ID de transacción")
        if payment.status is not PaymentStatus.APPROVED:
            raise PaymentProviderException("Solo se pueden anular pagos aprobados")
        response = await payment_provider(payment.provider).refund_payment(payment.provider_transaction_id)
        payment.raw_response = _safe_provider_data(response)
        transition_payment(payment, PaymentStatus.VOIDED)
        await self.session.commit()
        self._log("payment_voided", payment, result="success")
        return payment

    async def apply_webhook(
        self,
        transaction: dict,
        payload: dict,
        checksum: str | None = None,
    ) -> tuple[Payment | None, bool]:
        checksum = checksum or (payload.get("signature") or {}).get("checksum")
        reference = transaction.get("reference")
        payment = await self.repo.by_reference(reference) if reference else None
        event = PaymentWebhookEvent(
            event_hash=_webhook_hash(payload, checksum),
            provider=PaymentProviderType.WOMPI,
            event_type=str(payload.get("event", "unknown"))[:80],
            payment_id=payment.id if payment else None,
            provider_transaction_id=str(transaction.get("id")) if transaction.get("id") else None,
            reference=reference,
            payload=_safe_provider_data(payload),
        )
        try:
            inserted = await self.repo.add_webhook_event(event)
            if not inserted:
                await self.session.rollback()
                self._log("webhook_duplicate", payment, result="ignored")
                return payment, True
            if not payment:
                await self.session.commit()
                logger.info("webhook_payment_missing", extra={"provider": "wompi", "result": "ignored"})
                return None, False
            self._apply_provider_transaction(payment, transaction)
            payment.webhook_payload = _safe_provider_data(payload)
            await self.session.commit()
        except Exception:
            await self.session.rollback()
            raise
        self._log("webhook_applied", payment, result="success")
        return payment, False

    @staticmethod
    def _apply_provider_transaction(payment: Payment, transaction: dict) -> None:
        if transaction.get("reference") != payment.reference:
            raise PaymentProviderException("La referencia de Wompi no coincide con el pago")
        amount_in_cents = transaction.get("amount_in_cents")
        if amount_in_cents is not None and int(amount_in_cents) != payment.amount * 100:
            raise PaymentProviderException("El monto informado por Wompi no coincide con el pago")
        if transaction.get("currency") and transaction["currency"] != payment.currency:
            raise PaymentProviderException("La moneda informada por Wompi no coincide con el pago")
        transaction_id = transaction.get("id")
        if transaction_id:
            if payment.provider_transaction_id and payment.provider_transaction_id != str(transaction_id):
                raise PaymentProviderException("El ID de transacción de Wompi no coincide con el pago")
            payment.provider_transaction_id = str(transaction_id)
        method = transaction.get("payment_method_type")
        if method:
            payment.payment_method = str(method)
        transition_payment(payment, _wompi_status(str(transaction.get("status", ""))))

    @staticmethod
    def _log(event: str, payment: Payment | None, **fields) -> None:
        logger.info(
            event,
            extra={
                "payment_id": str(payment.id) if payment else None,
                "reference": payment.reference if payment else None,
                "provider": payment.provider.value if payment else None,
                "transaction_id": payment.provider_transaction_id if payment else None,
                **fields,
            },
        )
