class PaymentException(Exception):
    code = "PAYMENT_ERROR"
    message = "No fue posible procesar el pago"
    status_code = 400

    def __init__(self, message: str | None = None):
        self.message = message or self.message
        super().__init__(self.message)


class PaymentProviderException(PaymentException):
    code = "PAYMENT_PROVIDER_ERROR"
    message = "No fue posible procesar el pago con el proveedor"
    status_code = 502


class PaymentNotFoundException(PaymentException):
    code = "PAYMENT_NOT_FOUND"
    message = "No se encontró el pago solicitado"
    status_code = 404


class PaymentValidationException(PaymentException):
    code = "PAYMENT_VALIDATION_ERROR"
    message = "Los datos del pago no son válidos"
    status_code = 422


class IdempotencyConflictException(PaymentException):
    code = "IDEMPOTENCY_KEY_CONFLICT"
    message = "La llave de idempotencia ya se usó con otros datos"
    status_code = 409


class WebhookValidationException(PaymentException):
    code = "WEBHOOK_VALIDATION_ERROR"
    message = "El webhook no superó la validación"
    status_code = 401
