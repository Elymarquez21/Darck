"""Respuestas comunes documentadas en OpenAPI para los routers."""
ERROR_RESPONSES = {
    401: {"description": "Autenticación requerida o token inválido."},
    403: {"description": "El rol no tiene permiso para esta operación."},
    404: {"description": "El recurso solicitado no existe."},
    409: {"description": "Conflicto con un registro existente o relacionado."},
    422: {"description": "Parámetros o cuerpo de solicitud inválidos."},
}
