"""
Hashing de contraseñas con bcrypt.
"""
import bcrypt

SALT_ROUNDS = 10


def hash_password(plain_password: str) -> str:
    """Convierte una contraseña en texto plano en un hash seguro
    (nunca se guarda ni se transmite la contraseña original)."""
    salt = bcrypt.gensalt(SALT_ROUNDS)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def compare_password(plain_password: str, hashed: str) -> bool:
    """Compara la contraseña ingresada por el usuario contra el hash guardado."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed.encode("utf-8"))
