from app.payments.exceptions import PaymentValidationException
from app.payments.models.payment import PaymentProvider as PaymentProviderType
from app.payments.providers.base import PaymentProvider
from app.payments.providers.wompi import WompiProvider


def payment_provider(provider_type: PaymentProviderType) -> PaymentProvider:
    providers: dict[PaymentProviderType, type[PaymentProvider]] = {
        PaymentProviderType.WOMPI: WompiProvider,
    }
    provider_class = providers.get(provider_type)
    if provider_class is None:
        raise PaymentValidationException(f"El proveedor {provider_type.value} todavía no está habilitado")
    return provider_class()
