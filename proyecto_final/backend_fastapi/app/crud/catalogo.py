"""Consultas del catálogo separadas de los controladores HTTP."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Producto, Servicio


def listar_catalogo(db: Session, modelo, busqueda: str | None, estado: str | None, offset: int, limite: int):
    consulta = select(modelo)
    if busqueda:
        consulta = consulta.where(modelo.nombre.ilike(f"%{busqueda.strip()}%"))
    if estado:
        consulta = consulta.where(modelo.estado == estado)
    return db.scalars(consulta.order_by(modelo.creado_en.desc()).offset(offset).limit(limite)).all()


def obtener_producto(db: Session, id_producto: int) -> Producto | None:
    return db.scalar(select(Producto).where(Producto.id_producto == id_producto))


def listar_productos(db: Session, busqueda: str | None = None, estado: str | None = None, offset: int = 0, limite: int = 50):
    return listar_catalogo(db, Producto, busqueda, estado, offset, limite)


def listar_servicios(db: Session, busqueda: str | None = None, estado: str | None = None, offset: int = 0, limite: int = 50):
    return listar_catalogo(db, Servicio, busqueda, estado, offset, limite)
