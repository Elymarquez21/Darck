from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.payments.models.payment import PaymentProvider, PaymentStatus


class PaymentCreate(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "amount": 50000,
                    "currency": "COP",
                    "customer_email": "cliente@example.com",
                    "customer_name": "Cliente Demo",
                    "description": "Pago de prueba",
                    "provider": "wompi",
                }
            ]
        }
    )
    amount: int = Field(gt=0, le=50_000_000)
    currency: str = Field(default="COP", pattern="^COP$")
    customer_email: EmailStr
    customer_name: str = Field(min_length=2, max_length=160)
    description: str = Field(min_length=2, max_length=255)
    provider: PaymentProvider = PaymentProvider.WOMPI


class PaymentCreated(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "payment_id": "6f4de6a0-a57a-40e6-834f-4b9568d1a78b",
                    "reference": "IAZY-20260928-ABCDEF123456",
                    "status": "PENDING",
                    "checkout_url": "https://checkout.wompi.co/p/?...",
                    "provider": "wompi",
                }
            ]
        }
    )
    payment_id: UUID
    reference: str
    status: PaymentStatus
    checkout_url: str | None
    provider: PaymentProvider


class PaymentRead(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "6f4de6a0-a57a-40e6-834f-4b9568d1a78b",
                    "reference": "IAZY-20260928-ABCDEF123456",
                    "amount": 50000,
                    "currency": "COP",
                    "provider": "wompi",
                    "provider_transaction_id": None,
                    "status": "PENDING",
                    "payment_method": None,
                    "created_at": "2026-09-28T15:00:00Z",
                    "updated_at": "2026-09-28T15:00:00Z",
                }
            ]
        },
    )

    id: UUID
    reference: str
    amount: int
    currency: str
    provider: PaymentProvider
    provider_transaction_id: str | None
    status: PaymentStatus
    payment_method: str | None
    created_at: datetime
    updated_at: datetime
