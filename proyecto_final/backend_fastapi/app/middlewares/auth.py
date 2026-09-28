"""
Dependencias de autenticación y autorización para FastAPI.

Además de verificar la firma y la expiración del JWT (lo hace
automáticamente `jose.jwt.decode` dentro de `verificar_token`), estas
dependencias comprueban que el usuario asociado al token todavía
exista en la base de datos y siga activo, y refrescan su rol vigente
(por si fue modificado por un administrador después de haberse
emitido el token).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.utils.jwt import JWTError, verificar_token

bearer_scheme = HTTPBearer(auto_error=False, description="Pega el JWT emitido por /api/auth/login.")


def require_auth(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> dict:
    """Verifica que la petición incluya un token JWT válido en el header
    Authorization: Bearer <token>. FastAPI comprueba, en este orden:
    1. Existencia del token (header Authorization con esquema Bearer).
    2. Validez y firma del token (verificar_token / jose.jwt.decode).
    3. Expiración del token (claim "exp", verificado automáticamente).
    4. Usuario asociado: que ese id_usuario todavía exista y esté activo.
    Si todo es correcto, retorna el payload (con el rol actualizado
    desde la base de datos) para que la ruta lo reciba como dependencia.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"mensaje": "Acceso no autorizado. Token no proporcionado."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = verificar_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"mensaje": "Token inválido o expirado."},
        )

    # Import local para evitar un ciclo de importación entre
    # app.middlewares.auth y app.models (que a su vez depende de
    # app.config.db, igual que este módulo).
    from app.models import Usuario

    id_usuario = payload.get("id_usuario") or payload.get("sub")
    try:
        id_usuario = int(id_usuario)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail={"mensaje": "Token inválido o sin usuario asociado."}, headers={"WWW-Authenticate": "Bearer"})
    usuario_db = db.get(Usuario, id_usuario)
    if not usuario_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"mensaje": "El usuario asociado a este token ya no existe."},
        )

    if usuario_db.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"mensaje": "Tu cuenta se encuentra inactiva o bloqueada."},
        )

    # El rol se refresca desde la base de datos (no se confía ciegamente
    # en el que quedó "congelado" dentro del token al momento del login),
    # para que un cambio de rol hecho por un administrador tenga efecto
    # inmediato sin esperar a que el token expire.
    payload["id_rol"] = usuario_db.id_rol
    payload["nombre_rol"] = usuario_db.nombre_rol
    return payload


def require_role(*roles_permitidos: str):
    """Restringe el acceso a una ruta según los roles permitidos.
    Uso: Depends(require_role('administrador', 'empleado'))"""

    def dependencia(usuario: dict = Depends(require_auth)) -> dict:
        if usuario.get("nombre_rol") not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"mensaje": "No tienes permisos suficientes para realizar esta acción."},
            )
        return usuario

    return dependencia
