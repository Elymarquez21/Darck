from urllib.parse import parse_qs, urlparse

import pytest

from app.payments.core.config import payment_settings
from app.payments.integrations.wompi.client import WompiClient


@pytest.mark.asyncio
async def test_checkout_uses_documented_wompi_web_checkout_fields(monkeypatch):
    monkeypatch.setattr(payment_settings, "wompi_public_key", "pub_test_example")
    monkeypatch.setattr(payment_settings, "wompi_integrity_secret", "integrity-demo")
    url, metadata = await WompiClient().create_checkout(
        amount=50_000,
        currency="COP",
        reference="IAZY-20260928-ABCDEF123456",
        email="buyer@example.com",
        name="Buyer Demo",
        redirect_url=None,
    )
    query = parse_qs(urlparse(url).query)
    assert url.startswith("https://checkout.wompi.co/p/")
    assert query["amount-in-cents"] == ["5000000"]
    assert query["public-key"] == ["pub_test_example"]
    assert query["currency"] == ["COP"]
    assert query["reference"] == ["IAZY-20260928-ABCDEF123456"]
    assert query["customer-data:email"] == ["buyer@example.com"]
    assert "acceptance-token" not in query
    assert len(query["signature:integrity"][0]) == 64
    assert metadata == {"checkout": "wompi_web_checkout"}
