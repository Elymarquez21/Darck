# Comparativa: FastAPI y Django REST Framework

## Enfoque

FastAPI construye APIs a partir de funciones de ruta y modelos Pydantic. Las dependencias se declaran en los parámetros, y el framework genera OpenAPI y Swagger UI a partir de las rutas y sus tipos. Django REST Framework (DRF) se apoya en Django: sus serializers convierten y validan datos, y sus ViewSets agrupan operaciones de un recurso; los routers pueden generar las rutas REST.

## Comparación para este proyecto

| Aspecto | FastAPI (implementación actual) | Django REST Framework (alternativa) |
| --- | --- | --- |
| Validación y serialización | Esquemas Pydantic en `app/schemas` y parámetros tipados en las rutas. | `Serializer` o `ModelSerializer` para validar y representar datos. |
| CRUD | Funciones explícitas en routers separados por recurso. | `ModelViewSet` puede reunir las acciones estándar y un router registrar sus URLs. |
| Acceso y permisos | Dependencias `require_auth` y `require_role` compartidas por endpoint. | Clases de permiso configurables a nivel global, de vista o de acción. |
| Base de datos | SQLAlchemy y consultas SQL/MySQL en `app/routers`. | ORM integrado de Django y modelos Django. |
| Documentación | OpenAPI generado por FastAPI y Swagger UI en `/docs`. | Esquema OpenAPI con herramientas del ecosistema Django REST Framework. |
| Operaciones asíncronas | Rutas `async` y `BackgroundTasks` para tareas breves posteriores a la respuesta. | DRF es síncrono por diseño; tareas largas suelen delegarse a una cola externa. |

## Decisión

FastAPI encaja con la arquitectura ya entregada: React consume una API separada, SQLAlchemy accede a MySQL y Pydantic valida los contratos. Su documentación automática y la declaración de dependencias permiten describir y proteger rutas de forma directa. DRF sería una alternativa sólida si el sistema se migrara a Django y se quisiera aprovechar su ORM, autenticación y administración integrados. La elección describe el ajuste a este proyecto; no afirma una ventaja de rendimiento medida.

## Fuentes oficiales

- [FastAPI: OpenAPI y documentación](https://fastapi.tiangolo.com/features/)
- [FastAPI: dependencias](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [FastAPI: tareas en segundo plano](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [Django REST Framework: serializers](https://www.django-rest-framework.org/api-guide/serializers/)
- [Django REST Framework: ViewSets y routers](https://www.django-rest-framework.org/api-guide/viewsets/)
- [Django REST Framework: permisos](https://www.django-rest-framework.org/api-guide/permissions/)
