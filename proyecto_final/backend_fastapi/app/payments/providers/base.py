from abc import ABC, abstractmethod
from typing import Any

class PaymentProvider(ABC):
    """Provider port; concrete gateways own all provider-specific behavior."""

    @abstractmethod
    async def create_payment(
        self,
        *,
        amount: int,
        currency: str,
        reference: str,
        email: str,
        name: str,
        redirect_url: str | None,
    ) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def get_payment(self, provider_transaction_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def refund_payment(self, provider_transaction_id: str) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def validate_webhook(self, payload: dict, checksum: str | None = None) -> dict[str, Any]:
        raise NotImplementedError
