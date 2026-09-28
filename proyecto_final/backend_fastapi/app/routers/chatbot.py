"""Asistente inicial del catálogo y las gestiones de clientes."""
import asyncio
import re
from typing import Literal
from threading import Lock
from time import monotonic

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.config.settings import settings
from app.openapi import ERROR_RESPONSES

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"], responses={**ERROR_RESPONSES, 429: {"description": "Límite de consultas alcanzado."}})
_solicitudes_por_ip: dict[str, list[float]] = {}
_candado = Lock()


class MensajeChat(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=1200)


class ConsultaChat(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"mensaje": "¿Qué productos tienen?", "historial": []}]})
    mensaje: str = Field(min_length=1, max_length=1200)
    historial: list[MensajeChat] = Field(default_factory=list, max_length=8)


def _respuesta_faq(mensaje: str, productos: list[dict], servicios: list[dict]) -> str:
    texto = mensaje.casefold()
    if any(p in texto for p in ("pqr", "queja", "reclamo", "peticion", "petición", "sugerencia")):
        return "Puedo orientarte con una petición, queja o reclamo. Inicia sesión y abre Mi Cuenta → Mis PQR para registrar la solicitud y consultar su estado."
    if any(p in texto for p in ("comprar", "compra", "carrito", "pago", "pedido")):
        return "Para comprar, inicia sesión, agrega productos o servicios desde el catálogo y confirma el carrito. La compra queda registrada y puedes continuar la atención por WhatsApp."
    if any(p in texto for p in ("servicio", "asesoría", "asesoria", "maquillaje", "cita")):
        opciones = "; ".join(f"{s['nombre']} (${s['precio']})" for s in servicios[:5])
        return f"Estos son algunos servicios disponibles: {opciones}. Puedes abrir la sección Servicios para ver su descripción completa." if opciones else "Consulta la sección Servicios para ver las opciones disponibles."
    if any(p in texto for p in ("producto", "precio", "labial", "piel", "perfume", "maquillaje")):
        opciones = "; ".join(f"{p['nombre']} (${p['precio']})" for p in productos[:5])
        return f"Estos son algunos productos disponibles: {opciones}. En Productos puedes revisar existencias y detalles." if opciones else "Consulta la sección Productos para ver el catálogo disponible."
    return "Hola, puedo ayudarte a encontrar productos o servicios, orientarte con una compra o indicarte cómo registrar una PQR desde tu cuenta. ¿Qué necesitas?"


def _cargar_catalogo(db: Session) -> tuple[list[dict], list[dict]]:
    productos = [dict(f) for f in db.execute(text("SELECT nombre,descripcion,precio FROM productos WHERE estado='activo' ORDER BY nombre LIMIT 12")).mappings().all()]
    servicios = [dict(f) for f in db.execute(text("SELECT nombre,descripcion,precio FROM servicios WHERE estado='activo' ORDER BY nombre LIMIT 12")).mappings().all()]
    return productos, servicios


@router.post("/message", summary="Responder una consulta de atención al cliente")
async def responder(consulta: ConsultaChat, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    ahora = monotonic()
    with _candado:
        recientes = [momento for momento in _solicitudes_por_ip.get(ip, []) if ahora - momento < 60]
        if len(recientes) >= 12:
            raise HTTPException(429, "Has enviado varias consultas. Espera un minuto e inténtalo de nuevo.")
        recientes.append(ahora)
        _solicitudes_por_ip[ip] = recientes
        if len(_solicitudes_por_ip) > 1000:
            _solicitudes_por_ip.clear()
    productos, servicios = await run_in_threadpool(_cargar_catalogo, db)
    base = _respuesta_faq(consulta.mensaje, productos, servicios)
    texto = consulta.mensaje.casefold()
    accion = "pqr" if any(p in texto for p in ("pqr", "queja", "reclamo", "peticion", "petición", "sugerencia")) else None

    if not settings.OPENAI_API_KEY:
        return {"respuesta": base, "origen": "faq", "accion": accion}

    catalogo = {
        "productos": [{"nombre": p["nombre"], "descripcion": p["descripcion"], "precio": str(p["precio"])} for p in productos],
        "servicios": [{"nombre": s["nombre"], "descripcion": s["descripcion"], "precio": str(s["precio"])} for s in servicios],
    }
    sistema = (
        "Eres el asistente virtual en español de Ely Marquez, una tienda de belleza. "
        "Responde con amabilidad y brevedad. Usa solo este catálogo para afirmar nombres, precios o disponibilidad; "
        "si falta un dato, dilo claramente y remite al catálogo o a una persona. Orienta compras explicando el uso del carrito. "
        "Para PQR indica iniciar sesión y usar Mi Cuenta > Mis PQR; no afirmes haber registrado solicitudes. "
        "No solicites contraseñas, datos de pago ni información sensible. Catálogo actual: " + str(catalogo)
    )
    mensajes = [{"role": "system", "content": sistema}]
    mensajes.extend({"role": m.role, "content": m.content} for m in consulta.historial[-8:])
    mensajes.append({"role": "user", "content": consulta.mensaje})
    precios_catalogo = {str(p["precio"]) for p in productos} | {str(s["precio"]) for s in servicios}
    for intento in range(2):
        try:
            async with httpx.AsyncClient(timeout=20.0) as cliente:
                respuesta = await cliente.post(
                    f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={"model": settings.OPENAI_MODEL, "messages": mensajes, "max_completion_tokens": 220},
                )
                respuesta.raise_for_status()
                contenido = respuesta.json()["choices"][0]["message"]["content"]
                if isinstance(contenido, str) and contenido.strip():
                    # Si el proveedor menciona precios, exigir que coincidan con el catálogo leído de SQL.
                    importes = re.findall(r"(?:\$|COP\s*)([\d.,]+)", contenido, flags=re.IGNORECASE)
                    canonicos = {re.sub(r"\D", "", precio) for precio in precios_catalogo}
                    canonicos |= {str(int(re.sub(r"\D", "", precio) or "0") // 100) for precio in precios_catalogo}
                    if any(re.sub(r"\D", "", importe) not in canonicos for importe in importes):
                        return {"respuesta": base, "origen": "faq", "accion": accion}
                    return {"respuesta": contenido.strip(), "origen": "ia", "accion": accion}
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
            if intento == 0:
                await asyncio.sleep(0.25)
    return {"respuesta": base, "origen": "faq", "accion": accion}
