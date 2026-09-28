from fastapi import APIRouter, HTTPException

from app.payments.core.database import check_payment_database

router = APIRouter(tags=["health"])


@router.get("/health", summary="Estado del servicio", response_description="Servicio disponible")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get(
    "/health/db",
    summary="Comprobar PostgreSQL de pagos",
    response_description="PostgreSQL está disponible",
    responses={503: {"description": "PostgreSQL no está disponible"}},
)
async def health_db() -> dict[str, str]:
    try:
        await check_payment_database()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="PostgreSQL no está disponible") from exc
    return {"status": "ok"}
