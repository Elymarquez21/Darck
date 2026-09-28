from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.payments.core.config import payment_settings
from app.payments.core.database import get_payment_session
from app.payments.exceptions import WebhookValidationException
from app.payments.integrations.wompi.schemas import WompiWebhook
from app.payments.models.payment import PaymentProvider as PaymentProviderType
from app.payments.services.payment_factory import payment_provider
from app.payments.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/webhooks", tags=["payment-webhooks"])


@router.post(
    "/wompi",
    summary="Recibir evento de Wompi",
    description=(
        "Valida el checksum SHA-256 usando signature.properties, timestamp y WOMPI_EVENTS_SECRET; "
        "verifica el ambiente y procesa transaction.updated idempotentemente. El ejemplo OpenAPI "
        "es ilustrativo: una firma real debe venir de Wompi. No requiere token de usuario."
    ),
    responses={
        200: {"description": "Evento recibido o duplicado"},
        401: {"description": "Checksum o estructura inválidos"},
        422: {"description": "Payload inválido"},
    },
)
async def wompi_webhook(
    payload: WompiWebhook,
    event_checksum: str | None = Header(default=None, alias="X-Event-Checksum"),
    session: AsyncSession = Depends(get_payment_session),
):
    payload = payload.model_dump()
    provider = payment_provider(PaymentProviderType.WOMPI)
    transaction = provider.validate_webhook(payload, event_checksum)
    expected_environment = "test" if payment_settings.payment_env == "sandbox" else "prod"
    if payload.get("environment") != expected_environment:
        raise WebhookValidationException("El evento pertenece a otro ambiente")
    if payload.get("event") != "transaction.updated":
        return {"received": True, "processed": False, "duplicate": False}

    payment, duplicate = await PaymentService(session).apply_webhook(transaction, payload, event_checksum)
    return {"received": True, "processed": payment is not None and not duplicate, "duplicate": duplicate}
