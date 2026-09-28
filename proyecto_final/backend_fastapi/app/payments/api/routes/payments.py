from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.payments.core.database import get_payment_session
from app.payments.exceptions import PaymentNotFoundException, PaymentValidationException
from app.payments.schemas.payment import PaymentCreate, PaymentCreated, PaymentRead
from app.payments.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post(
    "",
    response_model=PaymentCreated,
    status_code=201,
    summary="Crear un pago",
    description=(
        "Crea un pago pendiente y una URL de Wompi Web Checkout. "
        "Acepta Idempotency-Key opcional. No requiere autenticación de usuario; "
        "protege este endpoint con controles de acceso y límites antes de exponerlo públicamente."
    ),
    responses={
        201: {"description": "Pago creado"},
        409: {"description": "La llave de idempotencia ya se usó con otros datos"},
        422: {"description": "Datos de pago inválidos"},
        502: {"description": "Error al comunicarse con Wompi"},
    },
)
async def create_payment(
    data: PaymentCreate,
    session: AsyncSession = Depends(get_payment_session),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key", max_length=128),
):
    if idempotency_key is not None and not idempotency_key.strip():
        raise PaymentValidationException("Idempotency-Key no puede estar vacío")
    payment = await PaymentService(session).create(data, idempotency_key.strip() if idempotency_key else None)
    return PaymentCreated(
        payment_id=payment.id,
        reference=payment.reference,
        status=payment.status,
        checkout_url=payment.checkout_url,
        provider=payment.provider,
    )


@router.get(
    "/reference/{reference}",
    response_model=PaymentRead,
    summary="Consultar pago por referencia",
    description="Consulta en PostgreSQL el estado actual asociado a la referencia única.",
    responses={404: {"description": "Pago no encontrado"}},
)
async def get_payment_by_reference(reference: str, session: AsyncSession = Depends(get_payment_session)):
    payment = await PaymentService(session).get_by_reference(reference)
    if not payment:
        raise PaymentNotFoundException()
    return payment


@router.get(
    "/{payment_id}",
    response_model=PaymentRead,
    summary="Consultar un pago",
    description="Devuelve los campos públicos del pago. No requiere autenticación de usuario.",
    responses={404: {"description": "Pago no encontrado"}},
)
async def get_payment(payment_id: UUID, session: AsyncSession = Depends(get_payment_session)):
    payment = await PaymentService(session).get(payment_id)
    if not payment:
        raise PaymentNotFoundException()
    return payment


@router.post(
    "/{payment_id}/sync",
    response_model=PaymentRead,
    summary="Sincronizar estado desde Wompi",
    description=(
        "Consulta GET /v1/transactions/{transaction_id} con llave privada desde el backend, "
        "valida referencia, monto y moneda y aplica una transición de estado permitida. "
        "La transacción debe tener un ID recibido mediante webhook."
    ),
    responses={
        404: {"description": "Pago no encontrado"},
        502: {"description": "Wompi no pudo consultar la transacción"},
    },
)
async def sync_payment(payment_id: UUID, session: AsyncSession = Depends(get_payment_session)):
    return await PaymentService(session).sync(payment_id)
