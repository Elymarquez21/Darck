"""
Rutas del catálogo de productos.
Expone el CRUD de productos bajo /api/productos.

La validación de los datos de entrada la hacen los esquemas Pydantic
de app/schemas/producto.py; este router habla con la base de datos a
través del modelo ORM Producto (app/models/producto.py).
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Response, status
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.crud.catalogo import listar_productos as consultar_productos, obtener_producto as consultar_producto
from app.dependencies import Pagination, producto_existente
from app.middlewares.auth import require_role
from app.models import Producto
from app.openapi import ERROR_RESPONSES
from app.schemas.producto import ProductoActualizar, ProductoCrear, ProductoRespuesta
from app.utils.respuestas import error_json
from app.services.catalogo import presentar_producto

router = APIRouter(prefix="/api/productos", tags=["productos"], responses=ERROR_RESPONSES)


# GET /api/productos → público (catálogo), visible para cualquier rol
@router.get("", response_model=list[ProductoRespuesta], summary="Consultar productos con filtros y paginación")
async def listar_productos(q: str | None = Query(default=None, min_length=1, max_length=100), estado: str | None = Query(default=None, pattern="^(activo|inactivo)$"), paginacion: Pagination = Depends(), db: Session = Depends(get_db)):
    productos = consultar_productos(db, q, estado, (paginacion.pagina - 1) * paginacion.por_pagina, paginacion.por_pagina)
    return [presentar_producto(p) for p in productos]


# GET /api/productos/{id} → público (detalle de un producto puntual)
@router.get("/{id}", response_model=ProductoRespuesta, summary="Consultar el detalle de un producto")
async def obtener_producto(producto: Producto = Depends(producto_existente)):
    return presentar_producto(producto)


# POST /api/productos → administrador y empleado
@router.post("", status_code=201)
async def crear_producto(
    datos: ProductoCrear,
    db: Session = Depends(get_db),
    usuario: dict = Depends(require_role("administrador", "empleado")),
):
    if datos.imagen_url is not None and usuario["nombre_rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"mensaje": "Solo un administrador puede asociar imágenes a productos."},
        )

    nuevo_producto = Producto(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        precio=datos.precio,
        stock=datos.stock or 0,
        imagen_url=datos.imagen_url if usuario["nombre_rol"] == "administrador" else None,
        id_categoria=datos.id_categoria,
        estado="activo",
        creado_por=usuario["id_usuario"],
    )
    db.add(nuevo_producto)
    db.commit()
    db.refresh(nuevo_producto)

    return {"mensaje": "Producto creado correctamente.", "id_producto": nuevo_producto.id_producto, "producto": presentar_producto(nuevo_producto)}


# PUT /api/productos/{id} → administrador y empleado
@router.put("/{id}")
async def actualizar_producto(
    id: Annotated[int, Path(gt=0)],
    datos: ProductoActualizar,
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador", "empleado")),
):
    producto = db.get(Producto, id)
    if not producto:
        return error_json(404, "Producto no encontrado.")

    cambios = datos.model_dump(exclude_unset=True)
    if "imagen_url" in cambios and _usuario["nombre_rol"] != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"mensaje": "Solo un administrador puede modificar imágenes de productos."},
        )

    for campo, valor in cambios.items():
        setattr(producto, campo, valor)

    db.commit()
    return {"mensaje": "Producto actualizado correctamente."}


# DELETE /api/productos/{id} → solo administrador
@router.delete("/{id}", status_code=204, response_class=Response, summary="Eliminar un producto")
async def eliminar_producto(
    id: Annotated[int, Path(gt=0)],
    db: Session = Depends(get_db),
    _usuario: dict = Depends(require_role("administrador")),
):
    producto = db.get(Producto, id)
    if not producto:
        return error_json(404, "Producto no encontrado.")
    db.delete(producto)
    db.commit()
    return None
