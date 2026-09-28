"""
Modelo ORM de la tabla `servicios` (catálogo administrable por
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

ESTADOS_SERVICIO = ("activo", "inactivo")


class Servicio(Base):
    __tablename__ = "servicios"

    id_servicio = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio = Column(Numeric(10, 2), nullable=False, default=0)
    duracion_minutos = Column(Integer, nullable=False, default=30)
    imagen_url = Column(String(255), nullable=True)
    id_categoria = Column(Integer, ForeignKey("categorias.id_categoria"), nullable=True)
    estado = Column(
        Enum(*ESTADOS_SERVICIO, name="estado_servicio_enum"),
        nullable=False,
        default="activo",
    )
    creado_por = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.now())
    actualizado_en = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    categoria = relationship("Categoria")
    creador = relationship("Usuario", back_populates="servicios_creados")

    @property
    def categoria_nombre(self) -> str | None:
        return self.categoria.nombre if self.categoria else None

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Servicio id_servicio={self.id_servicio} nombre={self.nombre!r}>"
