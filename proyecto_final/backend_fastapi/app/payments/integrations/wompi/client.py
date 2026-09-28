import asyncio
import hashlib
import logging
import time
from urllib.parse import urlencode

import httpx

from app.payments.core.config import payment_settings
from app.payments.exceptions import PaymentProviderException

logger = logging.getLogger("payments.provider.wompi")


class WompiClient:
    RETRIES = 2

    def __init__(self, client: httpx.AsyncClient | None = None):
        self._client = client

    @property
    def events_secret(self) -> str:
        return payment_settings.wompi_events_secret

    async def _request(self, method: str, path: str, **kwargs) -> dict:
        for attempt in range(self.RETRIES + 1):
            started = time.perf_counter()
            try:
                if self._client:
                    response = await self._client.request(
                        method,
                        f"{payment_settings.wompi_api_url.rstrip('/')}{path}",
                        timeout=12.0,
                        **kwargs,
                    )
                    response.raise_for_status()
                    data = response.json()
                else:
                    async with httpx.AsyncClient(
                        base_url=payment_settings.wompi_api_url.rstrip("/"), timeout=12.0
                    ) as client:
                        response = await client.request(method, path, **kwargs)
                        response.raise_for_status()
                        data = response.json()
                if not isinstance(data, dict):
                    raise PaymentProviderException()
                logger.info(
                    "provider_request_completed",
                    extra={
                        "provider": "wompi",
                        "endpoint": path,
                        "result": "success",
                        "duration_ms": round((time.perf_counter() - started) * 1000),
                    },
                )
                return data
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                logger.warning(
                    "provider_request_failed",
                    extra={
                        "provider": "wompi",
                        "endpoint": path,
                        "result": "http_error",
                        "status_code": status_code,
                        "duration_ms": round((time.perf_counter() - started) * 1000),
                    },
                )
                if (status_code != 429 and status_code < 500) or attempt == self.RETRIES:
                    raise PaymentProviderException() from exc
            except httpx.RequestError as exc:
                logger.warning(
                    "provider_request_failed",
                    extra={
                        "provider": "wompi",
                        "endpoint": path,
                        "result": "network_error",
                        "duration_ms": round((time.perf_counter() - started) * 1000),
                    },
                )
                if attempt == self.RETRIES:
                    raise PaymentProviderException() from exc
            except ValueError as exc:
                logger.warning(
                    "provider_request_failed",
                    extra={
                        "provider": "wompi",
                        "endpoint": path,
                        "result": "invalid_json",
                        "duration_ms": round((time.perf_counter() - started) * 1000),
                    },
                )
                raise PaymentProviderException() from exc
            await asyncio.sleep(0.2 * 2**attempt)
        raise PaymentProviderException()

    async def create_checkout(
        self,
        *,
        amount: int,
        currency: str,
        reference: str,
        email: str,
        name: str,
        redirect_url: str | None,
    ) -> tuple[str, dict]:
        if not payment_settings.wompi_public_key or not payment_settings.wompi_integrity_secret:
            raise PaymentProviderException("Wompi checkout no está configurado")

        amount_in_cents = amount * 100
        signature = hashlib.sha256(
            f"{reference}{amount_in_cents}{currency}{payment_settings.wompi_integrity_secret}".encode("utf-8")
        ).hexdigest()
        params = {
            "public-key": payment_settings.wompi_public_key,
            "currency": currency,
            "amount-in-cents": amount_in_cents,
            "reference": reference,
            "signature:integrity": signature,
            "customer-data:email": email,
            "customer-data:full-name": name,
        }
        if redirect_url:
            params["redirect-url"] = redirect_url
        return f"https://checkout.wompi.co/p/?{urlencode(params)}", {"checkout": "wompi_web_checkout"}

    async def get_transaction(self, transaction_id: str) -> dict:
        if not payment_settings.wompi_private_key:
            raise PaymentProviderException("Wompi no está configurado para consultar transacciones")
        return await self._request(
            "GET",
            f"/transactions/{transaction_id}",
            headers={"Authorization": f"Bearer {payment_settings.wompi_private_key}"},
        )

    async def void_transaction(self, transaction_id: str) -> dict:
        if not payment_settings.wompi_private_key:
            raise PaymentProviderException("Wompi no está configurado para anular transacciones")
        return await self._request(
            "POST",
            f"/transactions/{transaction_id}/void",
            headers={"Authorization": f"Bearer {payment_settings.wompi_private_key}"},
        )


