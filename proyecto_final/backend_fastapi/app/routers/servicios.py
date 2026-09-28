"""
Rutas del catálogo de servicios.
Expone el CRUD de servicios bajo /api/servicios.

La validación de los datos de entrada la hacen los esquemas Pydantic
de app/schemas/servicio.py; este router habla con la base de datos a
través del modelo ORM Servicio (app/models/servicio.py).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.crud.catalogo import listar_servicios as consultar_servicios
from app.dependencies import Pagination
from app.middlewares.auth import require_role
from app.models import Servicio
from app.openapi import ERROR_RESPONSES
from app.schemas.servicio import ServicioActualizar, ServicioCrear, ServicioRespuesta
from app.utils.respuestas import error_json
from app.services.catalogo import presentar_servicio

router = APIRouter(prefix="/api/servicios", tags=["servicios"], responses=ERROR_RESPONSES)


# GET /api/servicios → público (catálogo), visible para cualquier rol
@router.get("", response_model=list[ServicioRespuesta], summary="Consultar servicios con filtros y paginación")
async def listar_servicios(q: str | None = Query(default=None, min_length=1, max_length=100), estado: str | None = Query(default=None, pattern="^(activo|inactivo)$"), paginacion: Pagination = Depends(), db: Session = Depends(get_db)):
    servicios = consultar_servicios(db, q, estado, (paginacion.pagina - 1) * paginacion.por_pagina, paginacion.por_pagina)
    return [presentar_servicio(s) for s in servicios]


# GET /api/servicios/{id} → público (detalle de un servicio puntual)
@router.get("/{id}", response_model=ServicioRespuesta)
async def obtener_servicio(id: Annotated[int, Path(gt=0)], db: Session = Depends(get_db)):
    servicio = db.get(Servicio, id)
    if not servicio:
        return error_json(404, "Servicio no encontrado.")

    return presentar_servicio(servicio)


# POST /api/servicios → administrador y empleado
@router.post("", status_code=201)
async def crear_servicio(
    datos: ServicioCrear,
    db: Session = Depends(get_db),
    usuario: dict = Depends(require_role("administrador", "empleado")),
):
    if datos.imagen_url is not None and usuario["nombre_rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"mensaje": "Solo un administrador puede asociar imágenes a servicios."},
        )

    nuevo_servicio = Servicio(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio=datos.precio,
        duracion_minutos=datos.duracion_minutos or 30,
        imagen_url=datos.imagen_url if usuario["nombre_rol"] == "administrador" else None,
        id_categoria=datos.id_categoria,
        estado="activo",
        creado_por=usuario["id_usuario"],
    )
    db.add(nuevo_servicio)
    db.commit()
    db.refresh(nuevo_servicio)

    return {"mensaje": "Servicio creado correctamente.", "id_servicio": nuevo_servicio.id_servicio, "servicio": presentar_servicio(nuevo_servicio)}


# PUT /api/servicios/{id} → administrador y empleado
@router.put("/{id}")
async def actualizar_servicio(
    id: Annotated[int, Path(gt=0)],
    datos: ServicioActualizar,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador", "empleado")),
):
    servicio = db.get(Servicio, id)
    if not servicio:
        return error_json(404, "Servicio no encontrado.")

    cambios = datos.model_dump(exclude_unset=True)
    if "imagen_url" in cambios and _usuario["nombre_rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"mensaje": "Solo un administrador puede modificar imágenes de servicios."},
        )

    for campo, valor in cambios.items():
        setattr(servicio, campo, valor)

    db.commit()
    return {"mensaje": "Servicio actualizado correctamente."}


# DELETE /api/servicios/{id} → solo administrador
@router.delete("/{id}", status_code=204, response_class=Response, summary="Eliminar un servicio")
async def eliminar_servicio(
    id: Annotated[int, Path(gt=0)],
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    servicio = db.get(Servicio, id)
    if not servicio:
        return error_json(404, "Servicio no encontrado.")
    db.delete(servicio)
    db.commit()
    return None
