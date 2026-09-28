"""
Esquemas Pydantic para autenticación: registro y login.
Reutilizan las mismas reglas de app/utils/validators.py para que el
registro público valide exactamente igual que el resto de la API.
"""
from typing import Optional

from pydantic import BaseModel, field_validator, model_validator

from app.utils import validators as v


def _validar(validador, valor):
    error = validador(valor)
    if error:
        raise ValueError(error)
    return valor


class RegistroUsuario(BaseModel):
    nombre: str
    apellido: str
    tipoDocumento: str
    numeroDocumento: str
    direccion: str
    telefono: str
    email: str
    password: str
    rol: Optional[str] = None  # 'cliente' (por defecto) o 'administrador'
    claveAdmin: Optional[str] = None

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

    @field_validator("rol")
    @classmethod
    def _val_rol(cls, valor: Optional[str]) -> Optional[str]:
        return _validar(v.validar_rol_registro, valor)

    @model_validator(mode="after")
    def _val_clave_admin(self) -> "RegistroUsuario":
        # Solo es obligatoria (que venga informada) cuando el usuario
        # elige registrarse como "administrador". La comparación contra
        # el código secreto del servidor se hace en el router (auth.py).
        error = v.validar_clave_admin(self.rol, self.claveAdmin)
        if error:
            raise ValueError(error)
        return self


class LoginUsuario(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _val_email(cls, valor: str) -> str:
        if not valor or not valor.strip():
            raise ValueError("Correo y contraseña son obligatorios.")
        return valor

    @field_validator("password")
    @classmethod
    def _val_password(cls, valor: str) -> str:
        if not valor:
            raise ValueError("Correo y contraseña son obligatorios.")
        return valor
