"""
Esquemas Pydantic para el recurso `servicio`.
Validan tipo de dato, obligatoriedad, longitudes y formato de la
información del catálogo antes de tocar la base de datos.
"""
from decimal import Decimal, InvalidOperation
from typing import Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

NOMBRE_MIN, NOMBRE_MAX = 2, 100
DESCRIPCION_MAX = 1000
IMAGEN_URL_MAX = 255
DURACION_MIN, DURACION_MAX = 5, 600  # minutos
ESTADOS_PERMITIDOS = ("activo", "inactivo")


def _validar_nombre(valor: str) -> str:
    if not valor or not valor.strip():
        raise ValueError("El nombre del servicio es obligatorio.")
    if len(valor.strip()) < NOMBRE_MIN or len(valor) > NOMBRE_MAX:
        raise ValueError(f"El nombre debe tener entre {NOMBRE_MIN} y {NOMBRE_MAX} caracteres.")
    return valor.strip()


def _validar_descripcion(valor: Optional[str]) -> Optional[str]:
    if valor is not None and len(valor) > DESCRIPCION_MAX:
        raise ValueError(f"La descripción no puede superar {DESCRIPCION_MAX} caracteres.")
    return valor


def _validar_precio(valor) -> Decimal:
    if valor is None:
        raise ValueError("El precio es obligatorio.")
    try:
        precio = Decimal(str(valor))
    except (InvalidOperation, ValueError):
        raise ValueError("El precio debe ser un número válido.")
    if precio < 0:
        raise ValueError("El precio no puede ser negativo.")
    return precio


def _validar_duracion(valor: Optional[int]) -> int:
    valor = 30 if valor is None else valor
    if valor < DURACION_MIN or valor > DURACION_MAX:
        raise ValueError(f"La duración debe estar entre {DURACION_MIN} y {DURACION_MAX} minutos.")
    return valor


def _validar_imagen_url(valor: Optional[str]) -> Optional[str]:
    if valor is None or valor == "":
        return valor
    if len(valor) > IMAGEN_URL_MAX:
        raise ValueError(f"La URL de la imagen no puede superar {IMAGEN_URL_MAX} caracteres.")
    url = urlparse(valor)
    if url.scheme not in ("http", "https") or not url.netloc:
        raise ValueError("La imagen debe usar una URL http o https válida.")
    return valor.strip()


def _validar_estado(valor: Optional[str]) -> Optional[str]:
    if valor is not None and valor not in ESTADOS_PERMITIDOS:
        raise ValueError("El estado enviado no es válido.")
    return valor


# ---------------------------------------------------------------------
# Creación (POST /api/servicios) — nombre y precio son obligatorios.
# ---------------------------------------------------------------------
class ServicioCrear(BaseModel):
    model_config = ConfigDict(json_schema_extra={"examples": [{"nombre": "Asesoría de maquillaje", "descripcion": "Sesión personalizada", "precio": "85000.00", "duracion_minutos": 60, "id_categoria": 2}]})
    nombre: str = Field(min_length=NOMBRE_MIN, max_length=NOMBRE_MAX)
    descripcion: Optional[str] = Field(default=None, max_length=DESCRIPCION_MAX)
    precio: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    duracion_minutos: Optional[int] = Field(default=30, ge=DURACION_MIN, le=DURACION_MAX)
    imagen_url: Optional[str] = Field(default=None, max_length=IMAGEN_URL_MAX)
    id_categoria: Optional[int] = Field(default=None, gt=0)
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _v_nombre(cls, valor: str) -> str:
        return _validar_nombre(valor)

    @field_validator("descripcion")
    @classmethod
    def _v_descripcion(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_descripcion(valor)

    @field_validator("precio", mode="before")
    @classmethod
    def _v_precio(cls, valor) -> Decimal:
        return _validar_precio(valor)

    @field_validator("duracion_minutos")
    @classmethod
    def _v_duracion(cls, valor: Optional[int]) -> int:
        return _validar_duracion(valor)

    @field_validator("imagen_url")
    @classmethod
    def _v_imagen_url(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_imagen_url(valor)

    @field_validator("estado")
    @classmethod
    def _v_estado(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_estado(valor)


# ---------------------------------------------------------------------
# Actualización (PUT /api/servicios/{id}) — todos los campos opcionales.
# ---------------------------------------------------------------------
class ServicioActualizar(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=NOMBRE_MIN, max_length=NOMBRE_MAX)
    descripcion: Optional[str] = Field(default=None, max_length=DESCRIPCION_MAX)
    precio: Optional[Decimal] = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    duracion_minutos: Optional[int] = Field(default=None, ge=DURACION_MIN, le=DURACION_MAX)
    imagen_url: Optional[str] = Field(default=None, max_length=IMAGEN_URL_MAX)
    id_categoria: Optional[int] = Field(default=None, gt=0)
    estado: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def _v_nombre(cls, valor: Optional[str]) -> Optional[str]:
        return valor if valor is None else _validar_nombre(valor)

    @field_validator("descripcion")
    @classmethod
    def _v_descripcion(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_descripcion(valor)

    @field_validator("precio", mode="before")
    @classmethod
    def _v_precio(cls, valor):
        return None if valor is None else _validar_precio(valor)

    @field_validator("duracion_minutos")
    @classmethod
    def _v_duracion(cls, valor: Optional[int]) -> Optional[int]:
        return valor if valor is None else _validar_duracion(valor)

    @field_validator("imagen_url")
    @classmethod
    def _v_imagen_url(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_imagen_url(valor)

    @field_validator("estado")
    @classmethod
    def _v_estado(cls, valor: Optional[str]) -> Optional[str]:
        return _validar_estado(valor)

    @model_validator(mode="after")
    def _al_menos_un_campo(self) -> "ServicioActualizar":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("No se enviaron campos para actualizar.")
        return self


# ---------------------------------------------------------------------
# Esquema de salida (respuesta del catálogo).
# ---------------------------------------------------------------------
class ServicioRespuesta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_servicio: int
    nombre: str
    descripcion: Optional[str] = None
    precio: Decimal
    duracion_minutos: int
    imagen_url: Optional[str] = None
    estado: str
    categoria: Optional[str] = None
