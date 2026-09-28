from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class PaymentSettings(BaseSettings):
    payment_env: str = "sandbox"
    payments_database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/payments"
    wompi_public_key: str = ""
    wompi_private_key: str = ""
    wompi_events_secret: str = ""
    wompi_integrity_secret: str = ""
    wompi_api_url: str = "https://sandbox.wompi.co/v1"
    app_url: str = "http://localhost:5173/payment-return"
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @model_validator(mode="after")
    def validate_environment_url(self):
        if self.payment_env not in {"sandbox", "production", "prod"}:
            raise ValueError("PAYMENT_ENV must be sandbox or production")
        if not self.wompi_api_url.startswith("https://"):
            raise ValueError("WOMPI_API_URL must use HTTPS")
        if self.payment_env == "sandbox" and "sandbox" not in self.wompi_api_url.lower():
            raise ValueError("Sandbox payments require a sandbox WOMPI_API_URL")
        if self.payment_env in {"production", "prod"} and "sandbox" in self.wompi_api_url.lower():
            raise ValueError("Production payments cannot use a sandbox WOMPI_API_URL")
        return self


payment_settings = PaymentSettings()
