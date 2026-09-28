"""Dependencias compartidas por las rutas de la API."""
from fastapi import Depends, Path, Query
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.crud.catalogo import obtener_producto
from app.errors import ResourceNotFound
from app.models import Producto


class Pagination:
    def __init__(
        self,
        pagina: int = Query(default=1, ge=1, description="Número de página."),
        por_pagina: int = Query(default=50, ge=1, le=100, description="Resultados por página (máximo 100)."),
    ):
        self.pagina = pagina
        self.por_pagina = por_pagina


def producto_existente(id_producto: int = Path(alias="id", gt=0), db: Session = Depends(get_db)) -> Producto:
    producto = obtener_producto(db, id_producto)
    if producto is None:
        raise ResourceNotFound("Producto no encontrado.")
    return producto
