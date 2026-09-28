"""
Generación y verificación de JWT.
"""
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config.settings import settings


def generar_token(usuario: dict) -> str:
    """Genera un token firmado con la información mínima necesaria del usuario.

    La clave de firma (SECRET_KEY), el algoritmo (ALGORITHM) y el tiempo
    de expiración (ACCESS_TOKEN_EXPIRE_MINUTES) se leen siempre desde
    `settings`, es decir, desde variables de entorno — nunca quedan
    fijos en el código fuente.
    """
    payload = {
        "sub": str(usuario["id_usuario"]),
        "id_usuario": usuario["id_usuario"],
        "correo": usuario["correo"],
        "id_rol": usuario["id_rol"],
        "nombre_rol": usuario["nombre_rol"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verificar_token(token: str) -> dict:
    """Verifica y decodifica un token. Lanza JWTError si es inválido o expiró."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


__all__ = ["generar_token", "verificar_token", "JWTError"]
