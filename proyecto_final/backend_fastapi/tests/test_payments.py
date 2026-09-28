from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.payments.exceptions import IdempotencyConflictException, PaymentProviderException, PaymentValidationException
from app.payments.models.payment import PaymentStatus
from app.payments.schemas.payment import PaymentCreate
from app.payments.services.payment_service import PaymentService, _wompi_status, transition_payment


def valid_request(**overrides):
    values = {
        "amount": 50_000,
        "currency": "COP",
        "customer_email": "buyer@example.com",
        "customer_name": "Buyer Demo",
        "description": "Sandbox payment",
        "provider": "wompi",
    }
    values.update(overrides)
    return PaymentCreate(**values)


class FakeSession:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


class FakeRepository:
    def __init__(self, _session):
        self.items = []

    async def by_idempotency_key(self, key):
        return next((item for item in self.items if item.idempotency_key == key), None)

    async def add(self, payment):
        payment.id = uuid4()
        self.items.append(payment)
        return payment

    async def by_id(self, payment_id):
        return next((item for item in self.items if item.id == payment_id), None)

    async def by_reference(self, reference):
        return next((item for item in self.items if item.reference == reference), None)


class FakeProvider:
    def __init__(self):
        self.creates = 0

    async def create_payment(self, **payment):
        self.creates += 1
        return {"checkout_url": "https://checkout.example.test/", "raw_response": {"accepted": True}}


def test_payment_request_rejects_invalid_amount_currency_and_email():
    with pytest.raises(ValidationError):
        valid_request(amount=0)
    with pytest.raises(ValidationError):
        valid_request(currency="USD")
    with pytest.raises(ValidationError):
        valid_request(customer_email="not-an-email")


def test_unknown_provider_is_rejected_by_request_schema():
    with pytest.raises(ValidationError):
        valid_request(provider="unknown-provider")


def test_wompi_statuses_map_to_internal_enum():
    assert _wompi_status("APPROVED") is PaymentStatus.APPROVED
    assert _wompi_status("FAILED") is PaymentStatus.DECLINED


def test_transition_cannot_regress_approved_payment():
    class PaymentStub:
        status = PaymentStatus.PENDING

    payment = PaymentStub()
    assert transition_payment(payment, PaymentStatus.APPROVED)
    assert not transition_payment(payment, PaymentStatus.PENDING)
    assert payment.status is PaymentStatus.APPROVED


@pytest.mark.asyncio
async def test_idempotency_key_returns_existing_payment_without_second_provider_call(monkeypatch):
    repository = FakeRepository(None)
    gateway = FakeProvider()
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    monkeypatch.setattr("app.payments.services.payment_service.payment_provider", lambda provider: gateway)
    session = FakeSession()
    service = PaymentService(session)

    first = await service.create(valid_request(), "request-123")
    second = await service.create(valid_request(), "request-123")

    assert first.id == second.id
    assert first.reference == second.reference
    assert len(repository.items) == 1
    assert gateway.creates == 1


@pytest.mark.asyncio
async def test_idempotency_key_rejects_different_payload(monkeypatch):
    repository = FakeRepository(None)
    gateway = FakeProvider()
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    monkeypatch.setattr("app.payments.services.payment_service.payment_provider", lambda provider: gateway)
    service = PaymentService(FakeSession())
    await service.create(valid_request(), "request-123")

    with pytest.raises(IdempotencyConflictException):
        await service.create(valid_request(amount=60_000), "request-123")
    assert gateway.creates == 1


@pytest.mark.asyncio
async def test_provider_error_leaves_payment_in_error_state(monkeypatch):
    class FailingProvider:
        async def create_payment(self, **payment):
            raise PaymentProviderException()

    repository = FakeRepository(None)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    monkeypatch.setattr("app.payments.services.payment_service.payment_provider", lambda provider: FailingProvider())

    with pytest.raises(PaymentProviderException):
        await PaymentService(FakeSession()).create(valid_request())
    assert repository.items[0].status is PaymentStatus.ERROR


@pytest.mark.asyncio
async def test_get_payment_returns_existing_or_none(monkeypatch):
    repository = FakeRepository(None)
    monkeypatch.setattr("app.payments.services.payment_service.PaymentRepository", lambda session: repository)
    service = PaymentService(FakeSession())
    assert await service.get(uuid4()) is None
