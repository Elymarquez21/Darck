"""
Modelo ORM de la tabla `usuarios`.
Conserva los campos definidos en el formulario de registro (segundo
avance) y trabajados en la tabla del tercer avance. La contraseña
NUNCA se guarda en texto plano: `contrasena_hash` almacena siempre
un hash bcrypt generado en app/utils/hash.py.
"""
from sqlalchemy import (
    Column,
    Enum,
    ForeignKey,
    Integer,
    String,
    TIMESTAMP,
    func,
)
from sqlalchemy.orm import relationship

from app.config.db import Base

TIPOS_DOCUMENTO = ("CC", "TI", "CE", "PA")
ESTADOS_USUARIO = ("activo", "inactivo", "bloqueado")


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(60), nullable=False)
    apellido = Column(String(60), nullable=False)
    tipo_documento = Column(
        Enum(*TIPOS_DOCUMENTO, name="tipo_documento_enum"),
        nullable=False,
        default="CC",
    )
    numero_documento = Column(String(20), nullable=False, unique=True)
    direccion = Column(String(150), nullable=False)
    telefono = Column(String(15), nullable=False)
    correo = Column(String(100), nullable=False, unique=True)
    # Hash bcrypt de la contraseña. Nunca se expone en las respuestas
    # de la API (los esquemas de salida en app/schemas no incluyen este campo).
    contrasena_hash = Column(String(255), nullable=False)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False, default=3)
    estado = Column(
        Enum(*ESTADOS_USUARIO, name="estado_usuario_enum"),
        nullable=False,
        default="activo",
    )
    creado_en = Column(TIMESTAMP, server_default=func.now())
    actualizado_en = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    rol = relationship("Rol", back_populates="usuarios")
    productos_creados = relationship("Producto", back_populates="creador")
    servicios_creados = relationship("Servicio", back_populates="creador")

    @property
    def nombre_rol(self) -> str | None:
        """Nombre del rol asociado (para exponerlo directamente en las
        respuestas de la API sin tener que hacer el JOIN a mano)."""
        return self.rol.nombre_rol if self.rol else None

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Usuario id_usuario={self.id_usuario} correo={self.correo!r}>"
