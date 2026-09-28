import hashlib
from uuid import uuid4

import pytest

from app.payments.integrations.wompi.webhook import verify_event_signature
from app.payments.models.payment import Payment, PaymentProvider, PaymentStatus
from app.payments.services.payment_service import PaymentService


def signed_event(status="APPROVED"):
    payload = {
        "event": "transaction.updated",
        "environment": "test",
        "data": {
            "transaction": {
                "id": "wompi-tx-1",
                "reference": "IAZY-20260928-ABCDEF123456",
                "status": status,
                "amount_in_cents": 5_000_000,
                "currency": "COP",
            }
        },
        "signature": {"properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"]},
        "timestamp": 123,
    }
    signed = "wompi-tx-1" + status + "5000000" + "123" + "events-secret"
    payload["signature"]["checksum"] = hashlib.sha256(signed.encode()).hexdigest()
    return payload


def test_webhook_signature_is_checked_with_declared_property_order():
    payload = signed_event()
    checksum = payload["signature"]["checksum"]
    assert verify_event_signature(payload, "events-secret", checksum)
    assert not verify_event_signature(payload, "wrong-secret", checksum)
    assert not verify_event_signature(payload, "events-secret", "incorrect-header")


class FakeSession:
    async def commit(self):
        return None

    async def rollback(self):
        return None


class FakeRepository:
    def __init__(self, payment, inserted=True):
        self.payment = payment
        self.inserted = inserted
        self.events = []

    async def by_reference(self, reference):
        return self.payment if self.payment and self.payment.reference == reference else None

    async def add_webhook_event(self, event):
        self.events.append(event)
        return self.inserted


def pending_payment():
    return Payment(
        id=uuid4(),
        reference="IAZY-20260928-ABCDEF123456",
        provider=PaymentProvider.WOMPI,
        amount=50_000,
        currency="COP",
        status=PaymentStatus.PENDING,
        customer_email="buyer@example.com",
        customer_name="Buyer Demo",
        description="Demo payment",
    )


@pytest.mark.asyncio
async def test_valid_webhook_updates_payment_and_stores_payload(monkeypatch):
    payment = pending_payment()
    repository = FakeRepository(payment)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    updated, duplicate = await PaymentService(FakeSession()).apply_webhook(
        signed_event()["data"]["transaction"], signed_event()
    )
    assert updated is payment
    assert not duplicate
    assert payment.status is PaymentStatus.APPROVED
    assert payment.provider_transaction_id == "wompi-tx-1"
    assert payment.webhook_payload["event"] == "transaction.updated"


@pytest.mark.asyncio
async def test_duplicate_webhook_is_ignored_without_state_mutation(monkeypatch):
    payment = pending_payment()
    repository = FakeRepository(payment, inserted=False)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    payload = signed_event()
    updated, duplicate = await PaymentService(FakeSession()).apply_webhook(
        payload["data"]["transaction"], payload, payload["signature"]["checksum"]
    )
    assert updated is payment
    assert duplicate
    assert payment.status is PaymentStatus.PENDING
    assert payment.provider_transaction_id is None


@pytest.mark.asyncio
async def test_webhook_for_unknown_reference_is_recorded_without_creating_payment(monkeypatch):
    repository = FakeRepository(None)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    payload = signed_event()
    updated, duplicate = await PaymentService(FakeSession()).apply_webhook(
        payload["data"]["transaction"], payload
    )
    assert updated is None
    assert not duplicate
    assert len(repository.events) == 1


@pytest.mark.asyncio
async def test_late_invalid_transition_does_not_change_terminal_state(monkeypatch):
    payment = pending_payment()
    payment.status = PaymentStatus.APPROVED
    repository = FakeRepository(payment)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    payload = signed_event("DECLINED")
    await PaymentService(FakeSession()).apply_webhook(payload["data"]["transaction"], payload)
    assert payment.status is PaymentStatus.APPROVED
