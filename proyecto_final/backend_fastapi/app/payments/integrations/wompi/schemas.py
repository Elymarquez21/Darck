from pydantic import BaseModel, ConfigDict


class WompiTransaction(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    reference: str
    status: str
    amount_in_cents: int | None = None
    currency: str | None = None
    payment_method_type: str | None = None


class WompiWebhook(BaseModel):
    model_config = ConfigDict(
        extra="allow",
        json_schema_extra={
            "examples": [
                {
                    "event": "transaction.updated",
                    "data": {
                        "transaction": {
                            "id": "1234-1610641025-49201",
                            "amount_in_cents": 5000000,
                            "reference": "IAZY-20260928-ABCDEF123456",
                            "currency": "COP",
                            "status": "APPROVED",
                            "payment_method_type": "CARD",
                        }
                    },
                    "environment": "test",
                    "signature": {
                        "properties": [
                            "transaction.id",
                            "transaction.status",
                            "transaction.amount_in_cents",
                        ],
                        "checksum": "<checksum generado por Wompi>",
                    },
                    "timestamp": 1530291411,
                    "sent_at": "2026-09-28T15:00:00.000Z",
                }
            ]
        },
    )

    event: str
    data: dict
    environment: str
    signature: dict
    timestamp: int
