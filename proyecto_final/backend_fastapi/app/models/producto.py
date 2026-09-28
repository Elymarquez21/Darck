"""
Modelo ORM de la tabla `productos` (catálogo administrable por
administrador/empleado, de lectura pública para el catálogo).
"""
from sqlalchemy import (
    Column,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    TIMESTAMP,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.config.db import Base

ESTADOS_PRODUCTO = ("activo", "inactivo")


class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio = Column(Numeric(10, 2), nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    imagen_url = Column(String(255), nullable=True)
    id_categoria = Column(Integer, ForeignKey("categorias.id_categoria"), nullable=True)
    estado = Column(
        Enum(*ESTADOS_PRODUCTO, name="estado_producto_enum"),
        nullable=False,
        default="activo",
    )
    creado_por = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.now())
    actualizado_en = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    categoria = relationship("Categoria")
    creador = relationship("Usuario", back_populates="productos_creados")

    @property
    def categoria_nombre(self) -> str | None:
        return self.categoria.nombre if self.categoria else None

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Producto id_producto={self.id_producto} nombre={self.nombre!r}>"
