"""
Rutas de autenticación: registro, login y perfil.
Expone los endpoints /api/auth/register, /api/auth/login y
/api/auth/perfil con un formato de respuesta consistente
("mensaje", "usuario", "token") que consume el Frontend
(services/api.js).

La validación de los datos de entrada la hacen los esquemas Pydantic
de app/schemas/auth.py; este router se encarga de la lógica de
negocio (clave de administrador, duplicados, credenciales) y de
hablar con la base de datos a través del modelo ORM Usuario.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config.db import get_db
from app.config.settings import settings
from app.middlewares.auth import require_auth
from app.openapi import ERROR_RESPONSES
from app.models import Usuario
from app.schemas.auth import LoginUsuario, RegistroUsuario
from app.schemas.usuario import UsuarioRespuesta
from app.utils.hash import compare_password, hash_password
from app.utils.jwt import generar_token
from app.utils.respuestas import error_json

router = APIRouter(prefix="/api/auth", tags=["auth"], responses=ERROR_RESPONSES)

# Mapa de roles del formulario público a su id_rol en la base de datos.
# El rol "empleado" (id_rol = 2) no se ofrece en el registro público.
ID_ROL_POR_NOMBRE = {"cliente": 3, "administrador": 1}


@router.post("/register", status_code=201)
async def register(datos: RegistroUsuario, db: Session = Depends(get_db)):
    # Si no se especifica, el registro público es de tipo "cliente".
    rol_solicitado = "administrador" if datos.rol == "administrador" else "cliente"

    # Para registrarse como administrador es obligatorio conocer la clave
    # especial configurada en el servidor (variable ADMIN_REGISTRATION_CODE).
    # Esta clave nunca se guarda en la base de datos, solo se compara.
    if rol_solicitado == "administrador":
        clave_esperada = settings.ADMIN_REGISTRATION_CODE
        if not clave_esperada or datos.claveAdmin != clave_esperada:
            return error_json(403, "La clave de administrador ingresada no es correcta.")

    existente = (
        db.query(Usuario)
        .filter(or_(Usuario.correo == datos.email, Usuario.numero_documento == datos.numeroDocumento))
        .first()
    )
    if existente:
        return error_json(409, "Ya existe un usuario con ese correo o número de documento.")

    # La contraseña nunca se guarda en texto plano: se aplica hashing (bcrypt).
    nuevo_usuario = Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        tipo_documento=datos.tipoDocumento,
        numero_documento=datos.numeroDocumento,
        direccion=datos.direccion,
        telefono=datos.telefono,
        correo=datos.email,
        contrasena_hash=hash_password(datos.password),
        id_rol=ID_ROL_POR_NOMBRE[rol_solicitado],
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {"mensaje": "Usuario registrado correctamente.", "id_usuario": nuevo_usuario.id_usuario}


@router.post("/login")
async def login(datos: LoginUsuario, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.correo == datos.email).first()

    if not usuario:
        return error_json(401, "Credenciales inválidas.")

    if usuario.estado != "activo":
        return error_json(403, "Tu cuenta se encuentra inactiva o bloqueada.")

    if not compare_password(datos.password, usuario.contrasena_hash):
        return error_json(401, "Credenciales inválidas.")

    token = generar_token(
        {
            "id_usuario": usuario.id_usuario,
            "correo": usuario.correo,
            "id_rol": usuario.id_rol,
            "nombre_rol": usuario.nombre_rol,
        }
    )

    return {
        "mensaje": "Inicio de sesión exitoso.",
        "token": token,
        "usuario": {
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "correo": usuario.correo,
            "rol": usuario.nombre_rol,
        },
    }


@router.get("/perfil")
async def perfil(usuario: dict = Depends(require_auth), db: Session = Depends(get_db)):
    db_usuario = db.get(Usuario, usuario["id_usuario"])
    if not db_usuario:
        return error_json(404, "Usuario no encontrado.")

    return UsuarioRespuesta.model_validate(db_usuario)
