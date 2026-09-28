import json
import logging
from datetime import datetime, timezone

from app.payments.core.config import payment_settings


class PaymentJsonFormatter(logging.Formatter):
    SAFE_FIELDS = (
        "payment_id",
        "reference",
        "provider",
        "transaction_id",
        "endpoint",
        "duration_ms",
        "result",
        "error_code",
        "status_code",
        "http_method",
    )

    def format(self, record: logging.LogRecord) -> str:
        item = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "event": record.getMessage(),
        }
        item.update({field: getattr(record, field) for field in self.SAFE_FIELDS if hasattr(record, field)})
        return json.dumps(item, ensure_ascii=False, separators=(",", ":"))


def configure_payment_logging() -> None:
    logger = logging.getLogger("payments")
    logger.setLevel(getattr(logging, payment_settings.log_level.upper(), logging.INFO))
    if not any(isinstance(handler.formatter, PaymentJsonFormatter) for handler in logger.handlers):
        handler = logging.StreamHandler()
        handler.setFormatter(PaymentJsonFormatter())
        logger.addHandler(handler)
    logger.propagate = False


def log_payment_request(method: str, endpoint: str, duration_ms: int, status_code: int) -> None:
    logging.getLogger("payments.api").info(
        "payment_api_request",
        extra={
            "http_method": method,
            "endpoint": endpoint,
            "duration_ms": duration_ms,
            "status_code": status_code,
            "result": "success" if status_code < 400 else "error",
        },
    )
