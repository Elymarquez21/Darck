"""Excepciones de dominio y códigos HTTP asociados."""


class DomainError(Exception):
    status_code = 400

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ResourceNotFound(DomainError):
    status_code = 404


class ResourceConflict(DomainError):
    status_code = 409
