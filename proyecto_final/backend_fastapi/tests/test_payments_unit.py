import hashlib

from app.payments.integrations.wompi.webhook import verify_event_signature
from app.payments.models.payment import PaymentStatus
from app.payments.services.payment_service import transition_payment


def test_wompi_webhook_signature_is_validated_with_declared_property_order():
    payload = {
        "data": {"transaction": {"id": "tx-1", "status": "APPROVED"}},
        "signature": {"properties": ["transaction.id", "transaction.status"]},
        "timestamp": 123,
    }
    raw = "tx-1APPROVED123events-secret"
    checksum = hashlib.sha256(raw.encode()).hexdigest()
    payload["signature"]["checksum"] = checksum

    assert verify_event_signature(payload, "events-secret", checksum)
    assert not verify_event_signature(payload, "wrong-secret", checksum)
    assert not verify_event_signature(payload, "events-secret", "bad-header")


def test_approved_payment_cannot_return_to_pending():
    class StubPayment:
        status = PaymentStatus.PENDING

    payment = StubPayment()
    assert transition_payment(payment, PaymentStatus.APPROVED)
    assert not transition_payment(payment, PaymentStatus.PENDING)
    assert payment.status is PaymentStatus.APPROVED


def test_terminal_payment_cannot_be_changed_by_late_event():
    class StubPayment:
        status = PaymentStatus.DECLINED

    payment = StubPayment()
    assert not transition_payment(payment, PaymentStatus.APPROVED)
    assert payment.status is PaymentStatus.DECLINED
