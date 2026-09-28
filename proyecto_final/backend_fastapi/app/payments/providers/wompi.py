from typing import Any

from app.payments.exceptions import PaymentProviderException, WebhookValidationException
from app.payments.integrations.wompi.client import WompiClient
from app.payments.integrations.wompi.schemas import WompiTransaction
from app.payments.integrations.wompi.webhook import verify_event_signature
from app.payments.providers.base import PaymentProvider


class WompiProvider(PaymentProvider):
    def __init__(self, client: WompiClient | None = None):
        self.client = client or WompiClient()

    async def create_payment(
        self,
        *,
        amount: int,
        currency: str,
        reference: str,
        email: str,
        name: str,
        redirect_url: str | None,
    ) -> dict[str, Any]:
        checkout_url, response = await self.client.create_checkout(
            amount=amount,
            currency=currency,
            reference=reference,
            email=email,
            name=name,
            redirect_url=redirect_url,
        )
        return {"checkout_url": checkout_url, "transaction_id": None, "raw_response": response}

    async def get_payment(self, provider_transaction_id: str) -> dict[str, Any]:
        response = await self.client.get_transaction(provider_transaction_id)
        raw_transaction = response.get("data", response)
        try:
            transaction = WompiTransaction.model_validate(raw_transaction).model_dump()
            transaction["_provider_response"] = response
            return transaction
        except Exception as exc:
            raise PaymentProviderException() from exc

    async def refund_payment(self, provider_transaction_id: str) -> dict[str, Any]:
        response = await self.client.void_transaction(provider_transaction_id)
        try:
            transaction = WompiTransaction.model_validate(response.get("data", response)).model_dump()
            transaction["_provider_response"] = response
            return transaction
        except Exception as exc:
            raise PaymentProviderException() from exc

    def validate_webhook(self, payload: dict, checksum: str | None = None) -> dict[str, Any]:
        if not verify_event_signature(payload, self.client.events_secret, checksum):
            raise WebhookValidationException()
        try:
            from app.payments.integrations.wompi.schemas import WompiWebhook

            WompiWebhook.model_validate(payload)
            if payload.get("event") != "transaction.updated":
                return {}
            transaction = payload["data"]["transaction"]
            return WompiTransaction.model_validate(transaction).model_dump()
        except Exception as exc:
            raise WebhookValidationException("La estructura del evento de Wompi no es válida") from exc
