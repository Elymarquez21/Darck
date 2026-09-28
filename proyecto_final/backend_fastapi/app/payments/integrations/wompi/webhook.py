import hashlib
import hmac
from collections.abc import Mapping


def _read_path(payload: Mapping, path: str):
    value = payload
    for part in path.split("."):
        if not isinstance(value, Mapping) or part not in value:
            raise ValueError(f"Webhook signature references missing property: {path}")
        value = value[part]
    return value


def verify_event_signature(payload: dict, secret: str, header_checksum: str | None = None) -> bool:
    signature = payload.get("signature") or {}
    expected = signature.get("checksum")
    if header_checksum and expected and not hmac.compare_digest(header_checksum, expected):
        return False
    expected = header_checksum or expected
    properties = signature.get("properties") or []
    timestamp = payload.get("timestamp")
    if not expected or not properties or timestamp is None or not secret:
        return False
    try:
        source = "".join(str(_read_path(payload.get("data", {}), item)) for item in properties)
    except (ValueError, TypeError):
        return False
    source += f"{timestamp}{secret}"
    actual = hashlib.sha256(source.encode("utf-8")).hexdigest()
    return hmac.compare_digest(actual.lower(), str(expected).lower())
