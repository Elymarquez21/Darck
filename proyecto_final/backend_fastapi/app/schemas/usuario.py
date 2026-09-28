"""
Esquemas Pydantic para el recurso `usuario`.

Estos esquemas son los que reciben y validan los datos que llegan a
la API (tipos de dato, campos obligatorios, longitudes y formatos),
ANTES de que la información llegue a los modelos ORM (app/models) o
a la base de datos. Reutilizan las mismas reglas ya probadas en
app/utils/validators.py para no duplicar la lógica de validación.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.utils import validators as v

ESTADOS_PERMITIDOS = ("activo", "inactivo", "bloqueado")
ROLES_PERMITIDOS = (1, 2, 3)  # 1=administrador 2=empleado 3=cliente


def _validar(validador, valor):
    """Ejecuta un validador de app/utils/validators.py y convierte el
    mensaje de error (si existe) en un ValueError que Pydantic
    entiende y expone en la respuesta 422."""
    error = validador(valor)
    if error:
        raise ValueError(error)
    return valor


# ---------------------------------------------------------------------
# Creación de usuario (POST /api/usuarios) — la hace un administrador,
# por lo que exige también el rol y, opcionalmente, el estado inicial.
# ---------------------------------------------------------------------
class UsuarioCrear(BaseModel):
    nombre: str
    apellido: str
    tipoDocumento: str
    numeroDocumento: str
    direccion: str
    telefono: str
    email: str
    password: str
    id_rol: int
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _val_nombre(cls, valor: str) -> str:
        return _validar(lambda x: v.validar_nombre(x, "nombre"), valor)

    @field_validator("apellido")
    @classmethod
    def _val_apellido(cls, valor: str) -> str:
        return _validar(lambda x: v.validar_nombre(x, "apellido"), valor)

    @field_validator("tipoDocumento")
    @classmethod
    def _val_tipo_documento(cls, valor: str) -> str:
        return _validar(v.validar_tipo_documento, valor)

    @field_validator("numeroDocumento")
    @classmethod
    def _val_numero_documento(cls, valor: str) -> str:
        return _validar(v.validar_numero_documento, valor)

    @field_validator("direccion")
    @classmethod
    def _val_direccion(cls, valor: str) -> str:
        return _validar(v.validar_direccion, valor)

    @field_validator("telefono")
    @classmethod
    def _val_telefono(cls, valor: str) -> str:
        return _validar(v.validar_telefono, valor)

    @field_validator("email")
    @classmethod
    def _val_email(cls, valor: str) -> str:
        return _validar(v.validar_email, valor)

    @field_validator("password")
    @classmethod
    def _val_password(cls, valor: str) -> str:
        return _validar(v.validar_password, valor)

    @field_validator("id_rol")
    @classmethod
    def _val_id_rol(cls, valor: int) -> int:
        if valor not in ROLES_PERMITIDOS:
            raise ValueError("El id_rol enviado no es válido.")
        return valor

    @field_validator("estado")
    @classmethod
    def _val_estado(cls, valor: Optional[str]) -> Optional[str]:
        if valor is not None and valor not in ESTADOS_PERMITIDOS:
            raise ValueError("El estado enviado no es válido.")
        return valor


# ---------------------------------------------------------------------
# Actualización por un administrador (PUT /api/usuarios/{id}).
# Todos los campos son opcionales: solo se valida lo que llega.
# ---------------------------------------------------------------------
class UsuarioActualizar(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    password: Optional[str] = None
    id_rol: Optional[int] = None
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _val_nombre(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(lambda x: v.validar_nombre(x, "nombre"), valor)

    @field_validator("apellido")
    @classmethod
    def _val_apellido(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(lambda x: v.validar_nombre(x, "apellido"), valor)

    @field_validator("direccion")
    @classmethod
    def _val_direccion(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_direccion, valor)

    @field_validator("telefono")
    @classmethod
    def _val_telefono(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_telefono, valor)

    @field_validator("password")
    @classmethod
    def _val_password(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_password, valor)

    @field_validator("id_rol")
    @classmethod
    def _val_id_rol(cls, valor: Optional[int]) -> Optional[int]:
        if valor is not None and valor not in ROLES_PERMITIDOS:
            raise ValueError("El id_rol enviado no es válido.")
        return valor

    @field_validator("estado")
    @classmethod
    def _val_estado(cls, valor: Optional[str]) -> Optional[str]:
        if valor is not None and valor not in ESTADOS_PERMITIDOS:
            raise ValueError("El estado enviado no es válido.")
        return valor

    @model_validator(mode="after")
    def _al_menos_un_campo(self) -> "UsuarioActualizar":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("No se enviaron campos para actualizar.")
        return self


# ---------------------------------------------------------------------
# Autoservicio (PUT /api/usuarios/me): el propio usuario solo puede
# tocar sus datos de contacto y su contraseña. `extra="forbid"` hace
# que, si llega cualquier otro campo (id_rol, estado, email, correo,
# numeroDocumento, tipoDocumento), FastAPI rechace la petición con un
# error 422 antes de que el router siquiera la procese.
# ---------------------------------------------------------------------
class UsuarioActualizarPerfil(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: Optional[str] = None
    apellido: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    password: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _val_nombre(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(lambda x: v.validar_nombre(x, "nombre"), valor)

    @field_validator("apellido")
    @classmethod
    def _val_apellido(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(lambda x: v.validar_nombre(x, "apellido"), valor)

    @field_validator("direccion")
    @classmethod
    def _val_direccion(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_direccion, valor)

    @field_validator("telefono")
    @classmethod
    def _val_telefono(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_telefono, valor)

    @field_validator("password")
    @classmethod
    def _val_password(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar(v.validar_password, valor)

    @model_validator(mode="after")
    def _al_menos_un_campo(self) -> "UsuarioActualizarPerfil":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("No se enviaron campos para actualizar.")
        return self


# ---------------------------------------------------------------------
# PATCH /api/usuarios/{id}/estado
# ---------------------------------------------------------------------
class UsuarioCambiarEstado(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def _val_estado(cls, valor: str) -> str:
        if valor not in ESTADOS_PERMITIDOS:
            raise ValueError(
                f"Estado no válido. Los valores permitidos son: {', '.join(ESTADOS_PERMITIDOS)}."
            )
        return valor


# ---------------------------------------------------------------------
# Esquema de salida: nunca incluye la contraseña ni su hash.
# ---------------------------------------------------------------------
class UsuarioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_usuario: int
    nombre: str
    apellido: str
    tipo_documento: str
    numero_documento: str
    direccion: str
    telefono: str
    correo: str
    estado: str
    id_rol: int
    nombre_rol: Optional[str] = None
    creado_en: Optional[datetime] = None
