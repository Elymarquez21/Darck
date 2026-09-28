"""
Modelo ORM de la tabla `roles`.
Representa los perfiles de acceso del sistema: administrador,
empleado y cliente (ver database/schema.sql).
"""
from sqlalchemy import Column, Integer, String, TIMESTAMP, func
from sqlalchemy.orm import relationship

from app.config.db import Base


class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, autoincrement=True)
    nombre_rol = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(255), nullable=True)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    usuarios = relationship("Usuario", back_populates="rol")

    def __repr__(self) -> str:  # pragma: no cover - solo utilidad de depuración
        return f"<Rol id_rol={self.id_rol} nombre_rol={self.nombre_rol!r}>"
