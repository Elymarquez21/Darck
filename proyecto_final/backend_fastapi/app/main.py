"""
Punto de entrada de la aplicación FastAPI.
Configura CORS, registra las rutas de la API bajo /api y expone el
endpoint de salud /api/health.
"""
from contextlib import asynccontextmanager
import logging
import time
from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.errors import DomainError
from app.config.settings import settings
from app.routers import auth, chatbot, dashboard, productos, servicios, usuarios, ventas
from app.payments.api.routes.payments import router as payments_router
from app.payments.api.routes.webhooks import router as payment_webhooks_router
from app.payments.api.routes.health import router as payments_health_router
from app.payments.core.config import payment_settings
from app.payments.core.logging_config import configure_payment_logging, log_payment_request
from app.payments.exceptions import PaymentException

logger = logging.getLogger("ely_marquez.api")
logging.basicConfig(level=getattr(logging, payment_settings.log_level.upper(), logging.INFO))
configure_payment_logging()
try:
    VERSION = version("ely-marquez-api")
except PackageNotFoundError:
    VERSION = "1.0.0"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Código de arranque (equivalente al antiguo @app.on_event("startup")).
    print(f"🚀 Servidor backend escuchando en http://localhost:{settings.PORT}")
    if not settings.SECRET_KEY or len(settings.SECRET_KEY) < 32:
        raise RuntimeError("Configura SECRET_KEY con al menos 32 caracteres antes de iniciar el servicio.")
    yield
    # Código de apagado (si se necesitara liberar recursos al detener el servidor).


app = FastAPI(
    title="Ely Marquez API",
    version=VERSION,
    description="API Full Stack (FastAPI) para el proyecto Ely Marquez.",
    openapi_tags=[
        {"name": "auth", "description": "Registro, inicio de sesión y perfil."},
        {"name": "usuarios", "description": "Administración de usuarios y roles."},
        {"name": "productos", "description": "Catálogo y CRUD de productos."},
        {"name": "servicios", "description": "Catálogo y CRUD de servicios."},
        {"name": "ventas", "description": "Ventas, facturas y reportes."},
        {"name": "dashboard", "description": "Indicadores, estadísticas y PQR."},
        {"name": "chatbot", "description": "Atención inicial y preguntas frecuentes."},
        {"name": "sistema", "description": "Disponibilidad y metadatos del servicio."},
    ],
    lifespan=lifespan,
)
app.include_router(payments_router)
app.include_router(payment_webhooks_router)
app.include_router(payments_health_router)


@app.middleware("http")
async def logging_y_cabeceras(request: Request, call_next):
    inicio = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - inicio) * 1000)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith(("/api/v1/payments", "/api/v1/webhooks")):
        route = request.scope.get("route")
        log_payment_request(request.method, getattr(route, "path", request.url.path), duration_ms, response.status_code)
    else:
        logger.info("%s %s %s %sms", request.method, request.url.path, response.status_code, duration_ms)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Las rutas propias (auth.py, usuarios.py, etc.) ya devuelven { "mensaje": ... }
# para sus errores de negocio (validación, permisos, etc.). Este manejador
# cubre los HTTPException "crudos" (por ejemplo los que lanzan las
# dependencias de autenticación) para que también respondan con el mismo
# formato plano { "mensaje": "..." } en vez del { "detail": ... } por
# defecto de FastAPI, conservando el contrato que espera el Frontend
# (frontend/src/services/api.js lee siempre `data.mensaje`).
@app.exception_handler(HTTPException)
async def manejador_http_exception(request: Request, exc: HTTPException):
    if request.url.path.startswith(("/api/v1/payments", "/api/v1/webhooks")):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "error": {"code": "PAYMENT_HTTP_ERROR", "message": str(exc.detail)}},
            headers=dict(exc.headers or {}),
        )
    detalle = exc.detail
    if isinstance(detalle, dict):
        contenido = detalle
    else:
        contenido = {"mensaje": detalle}
    headers = dict(exc.headers or {})
    if exc.status_code == 401:
        headers.setdefault("WWW-Authenticate", "Bearer")
    return JSONResponse(status_code=exc.status_code, content=contenido, headers=headers)


@app.exception_handler(IntegrityError)
async def manejador_integridad(request: Request, exc: IntegrityError):
    if request.url.path.startswith(("/api/v1/payments", "/api/v1/webhooks")):
        return JSONResponse(
            status_code=409,
            content={"success": False, "error": {"code": "PAYMENT_CONFLICT", "message": "Conflicto al guardar el pago"}},
        )
    logger.info("Conflicto de integridad en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=409, content={"mensaje": "La operación entra en conflicto con un registro existente o relacionado."})


@app.exception_handler(DomainError)
async def manejador_dominio(request: Request, exc: DomainError):
    return JSONResponse(status_code=exc.status_code, content={"mensaje": exc.message})


# Los esquemas de entrada (app/schemas/*.py) validan tipos de dato,
# obligatoriedad, longitudes y formatos con Pydantic. Cuando una de
# esas validaciones falla, FastAPI lanza automáticamente un
# RequestValidationError con el formato { "detail": [...] } por
# defecto. Este manejador lo traduce al mismo formato plano
# { "mensaje": "...", "errores": [...] } que ya usa el resto de la
# API (ver app/utils/respuestas.py), para que el Frontend
# (frontend/src/services/api.js) pueda seguir leyendo `data.mensaje`
# sin importar si el error vino de una validación manual o de un
# esquema Pydantic.
@app.exception_handler(RequestValidationError)
async def manejador_validacion(request: Request, exc: RequestValidationError):
    if request.url.path.startswith(("/api/v1/payments", "/api/v1/webhooks")):
        return JSONResponse(
            status_code=422,
            content={"success": False, "error": {"code": "PAYMENT_VALIDATION_ERROR", "message": "La solicitud no es válida"}},
        )
    errores = []
    for error in exc.errors():
        if error.get("type") == "extra_forbidden":
            # Se intentó modificar un campo no permitido en un esquema con
            # extra="forbid" (por ejemplo, UsuarioActualizarPerfil bloqueando
            # id_rol/estado/correo/documento en el autoservicio de perfil).
            campo = error["loc"][-1] if error.get("loc") else "enviado"
            errores.append(f"No está permitido modificar el campo '{campo}' en esta operación.")
            continue

        mensaje = error.get("msg", "Dato inválido.")
        if mensaje.startswith("Value error, "):
            mensaje = mensaje[len("Value error, "):]
        loc = error.get("loc", [])
        campo = ".".join(str(parte) for parte in loc[1:]) or "solicitud"
        errores.append({"campo": campo, "mensaje": mensaje})

    if not errores:
        errores = ["Los datos enviados no son válidos."]

    return JSONResponse(
        status_code=422,
        content={"mensaje": errores[0]["mensaje"], "errores": errores},
    )


@app.exception_handler(Exception)
async def manejador_interno(request: Request, exc: Exception):
    if request.url.path.startswith(("/api/v1/payments", "/api/v1/webhooks")):
        logging.getLogger("payments.api").error(
            "payment_unhandled_error", extra={"endpoint": request.url.path, "result": "error", "error_code": "INTERNAL_ERROR"}
        )
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": {"code": "PAYMENT_INTERNAL_ERROR", "message": "Error interno"}},
        )
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"mensaje": "Ocurrió un error interno. Intenta de nuevo más tarde."})


@app.exception_handler(PaymentException)
async def manejador_payment_exception(request: Request, exc: PaymentException):
    logging.getLogger("payments.api").warning(
        "payment_domain_error", extra={"endpoint": request.url.path, "result": "error", "error_code": exc.code}
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


# Rutas de la API
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(productos.router)
app.include_router(servicios.router)
app.include_router(ventas.router)
app.include_router(dashboard.router)
app.include_router(chatbot.router)


@app.get("/api/health", summary="Comprobar disponibilidad de la API", tags=["sistema"])
async def health():
    from app.config.db import engine
    from sqlalchemy import text
    from app.payments.core.database import check_payment_database

    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    await check_payment_database()
    return {"estado": "ok", "mensaje": "API de Ely Marquez funcionando correctamente."}
