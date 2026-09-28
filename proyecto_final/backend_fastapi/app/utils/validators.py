# -----------------------------------------------------------------------
# Validaciones de datos de usuario del lado del servidor.
# Reflejan EXACTAMENTE las mismas reglas aplicadas en el Frontend
# (frontend/src/utils/validators.js), para que ningún dato inválido
# llegue a la base de datos, sin importar el cliente que consuma la API.
# -----------------------------------------------------------------------
import re
from typing import Optional

LIMITES_CAMPOS = {
    "nombre": {"min": 2, "max": 40},
    "apellido": {"min": 2, "max": 40},
    "numeroDocumento": {"min": 6, "max": 15},
    "direccion": {"min": 5, "max": 100},
    "telefono": {"min": 10, "max": 10},
    "email": {"min": 6, "max": 60},
    "password": {"min": 8, "max": 20},
}

NAME_REGEX = re.compile(r"^[A-Za-zÁÉÍÓÚÑÜáéíóúñü\s]+$")
DOC_REGEX = re.compile(r"^\d+$")
PHONE_REGEX = re.compile(r"^3\d{9}$")  # Celular colombiano: 10 dígitos, inicia en 3
EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$")
ADDRESS_REGEX = re.compile(r"^[A-Za-z0-9ÁÉÍÓÚÑÜáéíóúñü\s#\-.,]+$")
# Contraseña: al menos 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$")
TIPOS_DOCUMENTO_VALIDOS = ["CC", "TI", "CE", "PA"]
ROLES_REGISTRO_VALIDOS = ["cliente", "administrador"]


def validar_nombre(valor, etiqueta: str = "nombre") -> Optional[str]:
    limites = LIMITES_CAMPOS["nombre"]
    if not valor or not str(valor).strip():
        return f"El campo {etiqueta} es obligatorio."
    texto = str(valor)
    if len(texto.strip()) < limites["min"]:
        return f"El campo {etiqueta} debe tener al menos {limites['min']} caracteres."
    if len(texto) > limites["max"]:
        return f"El campo {etiqueta} no puede superar {limites['max']} caracteres."
    if not NAME_REGEX.match(texto):
        return f"El campo {etiqueta} solo puede contener letras y espacios."
    return None


def validar_tipo_documento(valor) -> Optional[str]:
    if not valor:
        return "El tipo de documento es obligatorio."
    if valor not in TIPOS_DOCUMENTO_VALIDOS:
        return "El tipo de documento no es válido."
    return None


def validar_numero_documento(valor) -> Optional[str]:
    limites = LIMITES_CAMPOS["numeroDocumento"]
    if not valor:
        return "El número de documento es obligatorio."
    texto = str(valor)
    if not DOC_REGEX.match(texto):
        return "El número de documento solo puede contener números."
    if len(texto) < limites["min"] or len(texto) > limites["max"]:
        return f"El número de documento debe tener entre {limites['min']} y {limites['max']} dígitos."
    return None


def validar_direccion(valor) -> Optional[str]:
    limites = LIMITES_CAMPOS["direccion"]
    if not valor or not str(valor).strip():
        return "La dirección es obligatoria."
    texto = str(valor)
    if len(texto.strip()) < limites["min"]:
        return f"La dirección debe tener al menos {limites['min']} caracteres."
    if len(texto) > limites["max"]:
        return f"La dirección no puede superar {limites['max']} caracteres."
    if not ADDRESS_REGEX.match(texto):
        return "La dirección contiene caracteres no permitidos."
    return None


def validar_telefono(valor) -> Optional[str]:
    limites = LIMITES_CAMPOS["telefono"]
    if not valor:
        return "El teléfono es obligatorio."
    texto = str(valor)
    if not DOC_REGEX.match(texto):
        return "El teléfono solo puede contener números."
    if len(texto) != limites["min"]:
        return f"El teléfono debe tener {limites['min']} dígitos."
    if not PHONE_REGEX.match(texto):
        return "El teléfono debe ser un celular colombiano válido (debe iniciar en 3)."
    return None


def validar_email(valor) -> Optional[str]:
    limites = LIMITES_CAMPOS["email"]
    if not valor:
        return "El correo es obligatorio."
    texto = str(valor)
    if len(texto) > limites["max"]:
        return f"El correo no puede superar {limites['max']} caracteres."
    if not EMAIL_REGEX.match(texto):
        return "El correo electrónico no tiene un formato válido."
    return None


def validar_password(valor) -> Optional[str]:
    limites = LIMITES_CAMPOS["password"]
    if not valor:
        return "La contraseña es obligatoria."
    texto = str(valor)
    if re.search(r"\s", texto):
        return "La contraseña no puede contener espacios."
    if len(texto) < limites["min"] or len(texto) > limites["max"]:
        return f"La contraseña debe tener entre {limites['min']} y {limites['max']} caracteres."
    if not PASSWORD_REGEX.match(texto):
        return "La contraseña debe incluir al menos una mayúscula, una minúscula, un número y un carácter especial."
    return None


def validar_rol_registro(valor) -> Optional[str]:
    if not valor:
        return None  # por defecto se asume "cliente"
    if valor not in ROLES_REGISTRO_VALIDOS:
        return "El tipo de cuenta seleccionado no es válido."
    return None


def validar_clave_admin(rol, clave_admin) -> Optional[str]:
    """La clave de administrador solo es obligatoria cuando el usuario elige
    registrarse como "administrador". Se compara contra la variable de
    entorno ADMIN_REGISTRATION_CODE en el router (auth.py), nunca se
    guarda en la base de datos."""
    if rol != "administrador":
        return None
    if not clave_admin or not str(clave_admin).strip():
        return "Debes ingresar la clave de administrador para registrarte con ese rol."
    return None


def validar_datos_usuario(datos: dict, parcial: bool = False) -> list[str]:
    """Valida un conjunto de datos de usuario (registro público, alta por un
    administrador o edición de perfil).

    Si `parcial` es True, únicamente se validan los campos presentes en
    `datos` (útil para actualizaciones donde el usuario solo envía los
    campos que desea modificar). Si es False (por defecto), todos los
    campos son obligatorios.
    """
    errores: list[str] = []

    def esta_presente(campo: str) -> bool:
        return campo in datos and datos[campo] is not None and datos[campo] != ""

    def chequear(campo: str, validador):
        if parcial and not esta_presente(campo):
            return
        error = validador(datos.get(campo))
        if error:
            errores.append(error)

    chequear("nombre", lambda v: validar_nombre(v, "nombre"))
    chequear("apellido", lambda v: validar_nombre(v, "apellido"))
    chequear("tipoDocumento", validar_tipo_documento)
    chequear("numeroDocumento", validar_numero_documento)
    chequear("direccion", validar_direccion)
    chequear("telefono", validar_telefono)
    chequear("email", validar_email)
    chequear("password", validar_password)
    chequear("rol", validar_rol_registro)

    # La clave de administrador depende del rol elegido, así que se valida
    # aparte (no encaja en el patrón "un campo -> un validador" de arriba).
    if not parcial or esta_presente("rol") or esta_presente("claveAdmin"):
        error_clave = validar_clave_admin(datos.get("rol"), datos.get("claveAdmin"))
        if error_clave:
            errores.append(error_clave)

    return errores
