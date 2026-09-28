"""
Rutas de administración de usuarios.
Expone el CRUD de usuarios bajo /api/usuarios con nombres de campo
y formato de respuesta consistentes con el resto de la API.

La validación de los datos de entrada la hacen los esquemas Pydantic
de app/schemas/usuario.py (tipos de dato, obligatoriedad, longitudes
y formatos); este router solo se encarga de la lógica de negocio y
de hablar con la base de datos a través de los modelos ORM de
app/models/usuario.py.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.middlewares.auth import require_auth, require_role
from app.models import Usuario
from app.openapi import ERROR_RESPONSES
from app.schemas.usuario import (
    UsuarioActualizar,
    UsuarioActualizarPerfil,
    UsuarioCambiarEstado,
    UsuarioCrear,
    UsuarioRespuesta,
)
from app.utils.hash import hash_password
from app.utils.respuestas import error_json

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"], responses=ERROR_RESPONSES)


def _aplicar_cambios(db_usuario: Usuario, cambios: dict) -> None:
    """Copia los campos validados del esquema Pydantic hacia el modelo
    ORM. La contraseña, si viene incluida, se hashea antes de guardarse."""
    if "password" in cambios:
        cambios["contrasena_hash"] = hash_password(cambios.pop("password"))
    for campo, valor in cambios.items():
        setattr(db_usuario, campo, valor)


# GET /api/usuarios → administrador y empleado
@router.get("", response_model=list[UsuarioRespuesta], summary="Consultar usuarios con filtros y paginación")
async def listar_usuarios(
    q: str | None = Query(default=None, min_length=1, max_length=100, description="Busca por nombre, apellido o correo."),
    estado: str | None = Query(default=None, pattern="^(activo|inactivo|bloqueado)$"),
    pagina: int = Query(default=1, ge=1),
    por_pagina: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador", "empleado")),
):
    consulta = db.query(Usuario)
    if q:
        patron = f"%{q.strip()}%"
        consulta = consulta.filter(or_(Usuario.nombre.ilike(patron), Usuario.apellido.ilike(patron), Usuario.correo.ilike(patron)))
    if estado:
        consulta = consulta.filter(Usuario.estado == estado)
    return consulta.order_by(Usuario.creado_en.desc()).offset((pagina - 1) * por_pagina).limit(por_pagina).all()


# GET /api/usuarios/{id} → administrador y empleado.
# Debe declararse ANTES de la ruta '/me' de más abajo no es necesario
# (son verbos distintos: este es GET, "/me" es PUT), pero de todas
# formas se deja aquí, junto al listado, por orden de lectura.
@router.get("/{id}", response_model=UsuarioRespuesta)
async def obtener_usuario(
    id: Annotated[int, Path(gt=0)],
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador", "empleado")),
):
    db_usuario = db.get(Usuario, id)
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")

    return db_usuario


# PUT /api/usuarios/me → cualquier usuario autenticado (autoservicio).
# Debe declararse ANTES de '/{id}' para que FastAPI no interprete "me"
# como un id de usuario.
@router.put("/me")
async def actualizar_mi_perfil(
    datos: UsuarioActualizarPerfil,
    usuario: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    db_usuario = db.get(Usuario, usuario["id_usuario"])
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")

    _aplicar_cambios(db_usuario, datos.model_dump(exclude_unset=True))
    db.commit()
    db.refresh(db_usuario)

    return {
        "mensaje": "Tu información se actualizó correctamente.",
        "usuario": UsuarioRespuesta.model_validate(db_usuario),
    }


# POST /api/usuarios → solo administrador
@router.post("", status_code=201)
async def crear_usuario(
    datos: UsuarioCrear,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    existente = (
        db.query(Usuario)
        .filter(or_(Usuario.correo == datos.email, Usuario.numero_documento == datos.numeroDocumento))
        .first()
    )
    if existente:
        return error_json(409, "Ya existe un usuario con ese correo o número de documento.")

    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        tipo_documento=datos.tipoDocumento,
        numero_documento=datos.numeroDocumento,
        direccion=datos.direccion,
        telefono=datos.telefono,
        correo=datos.email,
        contrasena_hash=hash_password(datos.password),
        id_rol=datos.id_rol,
        estado=datos.estado or "activo",
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "mensaje": "Usuario registrado correctamente.",
        "usuario": UsuarioRespuesta.model_validate(nuevo_usuario),
    }


# PUT /api/usuarios/{id} → actualizar datos / rol / estado (solo administrador)
@router.put("/{id}")
async def actualizar_usuario(
    id: Annotated[int, Path(gt=0)],
    datos: UsuarioActualizar,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    db_usuario = db.get(Usuario, id)
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")

    _aplicar_cambios(db_usuario, datos.model_dump(exclude_unset=True))
    db.commit()

    return {"mensaje": "Usuario actualizado correctamente."}


# PATCH /api/usuarios/{id}/estado → solo administrador.
# Endpoint específico para activar, inactivar o bloquear un usuario,
# sin necesidad de reenviar el resto de los datos del formulario.
@router.patch("/{id}/estado")
async def cambiar_estado_usuario(
    id: Annotated[int, Path(gt=0)],
    datos: UsuarioCambiarEstado,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    db_usuario = db.get(Usuario, id)
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")

    db_usuario.estado = datos.estado
    db.commit()

    return {"mensaje": f'Estado del usuario actualizado a "{datos.estado}" correctamente.'}


# DELETE /api/usuarios/{id} → solo administrador
@router.delete("/{id}", status_code=204, response_class=Response, summary="Eliminar un usuario")
async def eliminar_usuario(
    id: Annotated[int, Path(gt=0)],
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    db_usuario = db.get(Usuario, id)
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")
    db.delete(db_usuario)
    db.commit()
    return None
