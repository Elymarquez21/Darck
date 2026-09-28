from fastapi.testclient import TestClient
import pytest
from pydantic import ValidationError

from app.config.db import get_db
from app.config.settings import settings
from app.main import app
from app.routers.productos import ProductoCrear
from app.routers.chatbot import _respuesta_faq
from app.routers.ventas import VentaCrear


def _sin_base_de_datos():
    yield None


app.dependency_overrides[get_db] = _sin_base_de_datos
client = TestClient(app)


def test_health_disponible(monkeypatch):
    from unittest.mock import MagicMock
    from app.config.db import engine
    from app.payments.core import database as payment_database

    monkeypatch.setattr(engine, "connect", lambda: MagicMock())
    async def skip_payment_db_check():
        return None

    monkeypatch.setattr(payment_database, "check_payment_database", skip_payment_db_check)
    respuesta = client.get("/api/health")
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "ok"


def test_validacion_de_solicitud_usa_422():
    respuesta = client.post("/api/chatbot/message", json={})
    assert respuesta.status_code == 422
    assert respuesta.json()["mensaje"]
    assert respuesta.json()["errores"]


def test_id_de_producto_debe_ser_positivo():
    respuesta = client.get("/api/productos/0")
    assert respuesta.status_code == 422


def test_openapi_documenta_bearer_y_tags():
    esquema = client.get("/openapi.json").json()
    assert "HTTPBearer" in esquema["components"]["securitySchemes"]
    tags = {tag["name"] for tag in esquema["tags"]}
    assert {"productos", "ventas", "dashboard", "chatbot"} <= tags


def test_ruta_protegida_rechaza_sin_token():
    respuesta = client.get("/api/dashboard")
    assert respuesta.status_code == 401


def test_401_incluye_www_authenticate():
    respuesta = client.get("/api/dashboard")
    assert respuesta.headers["www-authenticate"] == "Bearer"


def test_esquema_producto_restringe_precio_y_stock():
    with pytest.raises(ValidationError):
        ProductoCrear(nombre="Crema facial", precio=-1, stock=-2)


def test_openapi_incluye_codigos_de_error_comunes():
    spec = client.get("/openapi.json").json()
    respuestas = spec["paths"]["/api/productos"]["get"]["responses"]
    assert "422" in respuestas
    assert "409" in respuestas


def test_error_de_negocio_recurso_inexistente():
    class BaseVacia:
        def scalar(self, consulta):
            return None

    app.dependency_overrides[get_db] = lambda: BaseVacia()
    try:
        respuesta = client.get("/api/productos/999")
        assert respuesta.status_code == 404
        assert respuesta.json()["mensaje"] == "Producto no encontrado."
    finally:
        app.dependency_overrides[get_db] = _sin_base_de_datos


def test_detalle_de_venta_no_permite_items_repetidos():
    with pytest.raises(ValidationError, match="una sola vez"):
        VentaCrear(items=[{"tipo": "producto", "id": 1, "cantidad": 1}, {"tipo": "producto", "id": 1, "cantidad": 2}])


def test_respuesta_local_del_chatbot_orienta_pqr():
    texto = _respuesta_faq("Quiero poner una queja", [], [])
    assert "Mi Cuenta" in texto


def test_chatbot_usa_respaldo_sin_llamar_al_proveedor(monkeypatch):
    class FilasVacias:
        def mappings(self):
            return self

        def all(self):
            return []

    class BaseVacia:
        def execute(self, consulta):
            return FilasVacias()

    monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
    app.dependency_overrides[get_db] = lambda: BaseVacia()
    try:
        respuesta = client.post("/api/chatbot/message", json={"mensaje": "Hola"})
        assert respuesta.status_code == 200
        assert respuesta.json()["origen"] == "faq"
    finally:
        app.dependency_overrides[get_db] = _sin_base_de_datos
