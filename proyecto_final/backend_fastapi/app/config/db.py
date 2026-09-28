"""
Conexión a la base de datos MySQL (SQLAlchemy).
Se usa SQLAlchemy Core para ejecutar SQL plano contra el esquema
relacional definido en database/schema.sql.
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config.settings import settings

# Pool de conexiones reutilizables hacia la base de datos relacional.
engine = create_engine(
    settings.get_database_url(),
    pool_pre_ping=True,
    pool_recycle=280,
    pool_size=1,
    max_overflow=0,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Clase base declarativa de la que heredan todos los modelos ORM
# (app/models/*.py). Las tablas ya existen en la base de datos
# (creadas por database/schema.sql); los modelos solo las describen
# para que SQLAlchemy pueda mapearlas a objetos Python.
class Base(DeclarativeBase):
    """Base común para los modelos ORM declarativos de SQLAlchemy 2."""


def get_db():
    """Dependencia de FastAPI: entrega una sesión de BD por request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection() -> None:
    """Utilidad para verificar la conexión al iniciar el servidor."""
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print("✅ Conexión a la base de datos establecida correctamente.")
    except Exception as error:  # noqa: BLE001
        print(f"❌ No fue posible conectar a la base de datos: {error}")
