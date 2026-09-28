"""
Modelos ORM (SQLAlchemy) que representan las tablas de la base de
datos relacional definida en database/schema.sql.

Se importan aquí todos los modelos para que:
  1) `Base.metadata` los conozca a todos (relaciones, FKs, etc.).
  2) El resto de la app pueda hacer `from app.models import Usuario`.
"""
from app.config.db import Base
from app.models.categoria import Categoria
from app.models.producto import Producto
from app.models.rol import Rol
from app.models.servicio import Servicio
from app.models.usuario import Usuario

__all__ = ["Base", "Rol", "Usuario", "Categoria", "Producto", "Servicio"]
