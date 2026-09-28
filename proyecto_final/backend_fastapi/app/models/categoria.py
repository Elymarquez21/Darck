"""
Modelo ORM de la tabla `categorias`.
Sirve de apoyo para clasificar tanto productos como servicios.
"""
from sqlalchemy import Column, Enum, Integer, String

from app.config.db import Base

TIPOS_CATEGORIA = ("producto", "servicio")


class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(60), nullable=False, unique=True)
    tipo = Column(Enum(*TIPOS_CATEGORIA, name="tipo_categoria_enum"), nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Categoria id_categoria={self.id_categoria} nombre={self.nombre!r}>"
