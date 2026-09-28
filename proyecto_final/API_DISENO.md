# Diseño de recursos REST

Los listados aceptan `pagina` (desde 1) y `por_pagina` (1–100). Los errores de validación responden 422; un recurso no encontrado responde 404, los conflictos de integridad 409, y las rutas privadas exigen Bearer JWT.

| Recurso | Verbo | Ruta | Respuestas principales |
| --- | --- | --- | --- |
| Sesión | POST | `/api/auth/login` | 200, 401, 422 |
| Cuenta | POST | `/api/auth/register` | 201, 403, 409, 422 |
| Perfil | GET | `/api/auth/perfil` | 200, 401 |
| Usuarios | GET | `/api/usuarios` | 200, 401, 403, 422 |
| Usuario | GET | `/api/usuarios/{id}` | 200, 404, 422 |
| Usuarios | POST | `/api/usuarios` | 201, 409, 422 |
| Usuario | PUT | `/api/usuarios/{id}` | 200, 404, 409, 422 |
| Usuario | DELETE | `/api/usuarios/{id}` | 204, 404, 409 |
| Productos | GET | `/api/productos` | 200, 422 |
| Producto | GET | `/api/productos/{id}` | 200, 404, 422 |
| Productos | POST | `/api/productos` | 201, 401, 403, 409, 422 |
| Producto | PUT | `/api/productos/{id}` | 200, 401, 403, 404, 409, 422 |
| Producto | DELETE | `/api/productos/{id}` | 204, 401, 403, 404, 409 |
| Servicios | GET | `/api/servicios` | 200, 422 |
| Servicio | GET | `/api/servicios/{id}` | 200, 404, 422 |
| Servicios | POST | `/api/servicios` | 201, 401, 403, 409, 422 |
| Servicio | PUT | `/api/servicios/{id}` | 200, 401, 403, 404, 409, 422 |
| Servicio | DELETE | `/api/servicios/{id}` | 204, 401, 403, 404, 409 |
| Ventas | POST | `/api/ventas` | 201, 401, 409, 422 |
| Ventas | GET | `/api/ventas` | 200, 401, 403, 422 |
| Venta | PATCH | `/api/ventas/{id_venta}/estado` | 200, 401, 403, 404, 409, 422 |
| Reporte diario | GET | `/api/ventas/reporte-diario` | 200, 401, 403, 422 |
| Facturas | GET | `/api/ventas/facturas` | 200, 401, 403, 422 |
| Factura PDF | GET | `/api/ventas/facturas/{numero_factura}/pdf` | 200, 401, 403, 404 |
| Dashboard | GET | `/api/dashboard` | 200, 401, 403 |
| Estadísticas | GET | `/api/dashboard/ventas` | 200, 401, 403, 422 |
| PQR | POST | `/api/pqrs` | 201, 401, 403, 422 |
| PQR | GET | `/api/pqrs/mias` | 200, 401 |
| PQR | PATCH | `/api/pqrs/{id_pqr}/estado` | 200, 401, 403, 404, 422 |
| Chat | POST | `/api/chatbot/message` | 200, 422, 429 |
| Salud | GET | `/api/health` | 200 |

La lista expresa el contrato esperado de cada operación; `/docs` contiene los esquemas y validaciones efectivos generados desde FastAPI.
