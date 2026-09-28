"""
Configuración centralizada de la aplicación.

Punto 23 (Variables de entorno): toda la información sensible
(credenciales de base de datos, clave de firma de tokens, algoritmo,
tiempo de expiración, etc.) se gestiona exclusivamente mediante
variables de entorno (.env, NUNCA versionado — ver .gitignore) y se
lee en un único lugar (esta clase). El resto del código nunca lee
os.environ directamente ni contiene secretos "quemados" en el
código: siempre importa `settings`.
"""
import os
from sqlalchemy.engine import URL, make_url
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Servidor
    PORT: int = int(os.getenv("PORT", 4000))

    # Base de datos MySQL.
    # Se puede definir la conexión completa con DATABASE_URL (útil para
    # servicios en la nube que entregan una sola cadena de conexión) o,
    # si no se define, se arma automáticamente a partir de las variables
    # sueltas DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
    DATABASE_URL_ENV: str = os.getenv("DATABASE_URL", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 3306))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_NAME: str = os.getenv("DB_NAME", "ely_marquez_db")

    # JWT: clave de firma, algoritmo y tiempo de expiración, todos
    # configurables por entorno (nunca hardcodeados en app/utils/jwt.py).
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 480))

    # Clave especial para registro de administradores (tampoco se guarda
    # en la base de datos: solo se compara contra la variable de entorno).
    ADMIN_REGISTRATION_CODE: str = os.getenv("ADMIN_REGISTRATION_CODE", "")

    # Proveedor IA del chatbot. La clave permanece solo en el backend.
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # CORS
    # Acepta un origen local o una lista separada por comas para despliegues.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    def get_database_url(self) -> URL:
        """Build the one canonical SQLAlchemy/Alembic URL, enforcing TiDB TLS."""
        if self.DATABASE_URL_ENV:
            if self.DATABASE_URL_ENV.startswith("mysql://"):
                raw_url = self.DATABASE_URL_ENV.replace("mysql://", "mysql+pymysql://", 1)
            else:
                raw_url = self.DATABASE_URL_ENV
            url = make_url(raw_url)
        else:
            url = URL.create(
                "mysql+pymysql", username=self.DB_USER, password=self.DB_PASSWORD,
                host=self.DB_HOST, port=self.DB_PORT, database=self.DB_NAME,
                query={"charset": "utf8mb4"},
            )
        if os.getenv("DATABASE_SSL_VERIFY", "false").lower() in {"1", "true", "yes"}:
            query = dict(url.query)
            query.update(ssl_verify_cert="true", ssl_verify_identity="true")
            url = url.set(query=query)
        return url

    @property
    def DATABASE_URL(self) -> str:
        return self.get_database_url().render_as_string(hide_password=False)


settings = Settings()
