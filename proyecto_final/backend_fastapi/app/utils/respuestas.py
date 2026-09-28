"""
Helper para construir respuestas de error JSON con un formato
consistente en toda la API: { "mensaje": "...", "errores": [...] }
"""
from typing import Optional

from fastapi.responses import JSONResponse


def error_json(status_code: int, mensaje: str, errores: Optional[list[str]] = None) -> JSONResponse:
    content = {"mensaje": mensaje}
    if errores is not None:
        content["errores"] = errores
    return JSONResponse(status_code=status_code, content=content)
