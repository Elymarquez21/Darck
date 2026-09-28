# Ely Marquez · Backend (FastAPI)

API REST construida con **Python + FastAPI** y **MySQL** que reemplaza al
backend anterior en Node.js/Express, conservando **exactamente el mismo
contrato de API** (mismas rutas, mismos nombres de campo, mismo formato de
respuesta JSON) para que el **Frontend en React no requiera ningún cambio**.

Implementa autenticación con **JWT**, contraseñas protegidas con
**bcrypt (hashing)**, operaciones **CRUD** y **control de acceso por roles**
(administrador, empleado, cliente) — idéntico al comportamiento del
backend original.

## 1. Requisitos

- Python 3.11+
- MySQL 8+ (o MariaDB 10.4+)

## 2. Crear la base de datos

El esquema relacional **no cambió** respecto al backend anterior. Ejecuta el
mismo script contra tu servidor MySQL:

```bash
mysql -u root -p < database/schema.sql
```

Esto crea la base `ely_marquez_db`, las tablas (`roles`, `permisos`,
`rol_permisos`, `usuarios`, `categorias`, `productos`, `servicios`,
`solicitudes_recuperacion`) y los datos iniciales de roles/permisos.

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con las credenciales de tu MySQL local. **Nunca se commitea**
(está en `.gitignore`) porque ahí vive toda la información sensible del
proyecto: `DB_HOST`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (o, alternativamente,
`DATABASE_URL` completa), `SECRET_KEY`, `ALGORITHM`,
`ACCESS_TOKEN_EXPIRE_MINUTES`, `ADMIN_REGISTRATION_CODE` y `FRONTEND_URL`.
Ver la sección [6. Seguridad implementada](#6-seguridad-implementada) para
el detalle de cada una.

## 4. Instalar dependencias y ejecutar

```bash
python -m venv venv
source venv/bin/activate        # En Windows: venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

El servidor queda disponible en `http://localhost:8000`, coherente con Docker Compose y el valor predeterminado de `VITE_API_URL`.
La documentación interactiva autogenerada por FastAPI queda disponible en `http://localhost:8000/docs`.

## 5. Endpoints principales

## 5. Endpoints principales

| Método | Ruta                  | Descripción                                   | Acceso                     |
|--------|-----------------------|------------------------------------------------|----------------------------|
| POST   | /api/auth/register    | Registra un cliente (hash de contraseña)        | Público                    |
| POST   | /api/auth/login       | Inicia sesión y retorna un JWT                  | Público                    |
| GET    | /api/auth/perfil      | Datos del usuario autenticado                   | JWT                        |
| GET    | /api/usuarios         | Lista usuarios                                  | admin, empleado            |
| POST   | /api/usuarios         | Crea usuario (empleado/administrador)           | admin                      |
| PUT    | /api/usuarios/me      | Autoservicio: actualiza mi propio perfil        | JWT                        |
| PUT    | /api/usuarios/:id     | Actualiza usuario (rol, estado, datos)          | admin                      |
| PATCH  | /api/usuarios/:id/estado | Cambia el estado de un usuario               | admin                      |
| DELETE | /api/usuarios/:id     | Elimina usuario                                 | admin                      |
| GET    | /api/productos        | Catálogo de productos                           | Público                    |
| POST   | /api/productos        | Crea producto                                   | admin, empleado            |
| PUT    | /api/productos/:id    | Actualiza producto                              | admin, empleado            |
| DELETE | /api/productos/:id    | Elimina producto                                | admin                      |
| GET    | /api/servicios        | Catálogo de servicios                           | Público                    |
| POST   | /api/servicios        | Crea servicio                                   | admin, empleado            |
| PUT    | /api/servicios/:id    | Actualiza servicio                              | admin, empleado            |
| DELETE | /api/servicios/:id    | Elimina servicio                                | admin                      |
| GET    | /api/health           | Estado de la API                                | Público                    |

Las rutas protegidas requieren el header:

```
Authorization: Bearer <token>
```

## 6. Seguridad implementada

### Seguridad de contraseñas (punto 22)

Está **prohibido almacenar contraseñas en texto plano**, así que nunca se
guarda ni se transmite la contraseña original: solo su hash.

- **Hashing con `bcrypt`** (`app/utils/hash.py`, `hash_password`), con
  *salt* aleatorio por usuario — nunca se guarda la contraseña, solo el
  hash (columna `contrasena_hash`).
- **Verificación en el login por comparación de hashes**
  (`compare_password`, con `bcrypt.checkpw`): la contraseña que envía el
  usuario nunca se compara ni se guarda en texto plano, solo se hashea y
  se compara contra el hash ya almacenado.
- Flujo end-to-end:
  1. Registro (`POST /api/auth/register`): contraseña en texto plano →
     `hash_password()` → se guarda solo el hash.
  2. Login (`POST /api/auth/login`): contraseña en texto plano →
     `compare_password(texto_plano, hash_guardado)` → nunca se decodifica
     el hash, solo se compara.
  3. Si coincide, se emite el JWT; si no, `401 Credenciales inválidas`.
- Esto aplica también al cambio de contraseña de un usuario existente
  (`app/routers/usuarios.py`): siempre se vuelve a hashear antes de
  guardar, nunca se persiste el valor recibido tal cual.

### Variables de entorno (punto 23)

Toda la información sensible se gestiona con **variables de entorno**
(`.env`, cargado con `python-dotenv` y centralizado en
`app/config/settings.py`; **nunca se commitea**, está en `.gitignore` —
solo se versiona `.env.example` con valores de ejemplo):

| Variable | Uso |
|---|---|
| `DATABASE_URL` (opcional) o `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` | Conexión a MySQL |
| `SECRET_KEY` | Clave con la que se firman los JWT |
| `ALGORITHM` | Algoritmo de firma del JWT (por defecto `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Minutos de validez del token |
| `ADMIN_REGISTRATION_CODE` | Clave para poder registrarse como administrador |
| `FRONTEND_URL` | Origen permitido por CORS |

Ningún módulo del backend lee `os.environ` directamente ni tiene un
secreto "quemado" en el código: todos importan `settings` desde
`app/config/settings.py`.

### Resto de medidas

- **Control de roles** mediante la dependencia `require_role(...)`.
- **Verificación completa del token en cada petición protegida**
  (`app/middlewares/auth.py`, dependencia `require_auth`), en este orden:
  1. **Existencia** del token (header `Authorization: Bearer <token>`).
  2. **Validez y firma** (`jose.jwt.decode` contra `SECRET_KEY`/`ALGORITHM`).
  3. **Expiración** (claim `exp`, verificada automáticamente).
  4. **Usuario asociado**: se confirma que el `id_usuario` del token
     todavía exista en la base de datos y que su `estado` sea `activo`
     (si fue eliminado o bloqueado después de emitido el token, el
     token deja de servir de inmediato, sin esperar a que expire).
  5. **Rol vigente**: el rol se relee desde la base de datos (no se
     confía en el que quedó "congelado" en el token al momento del
     login), para que `require_role(...)` siempre evalúe el rol actual.
- **Validaciones de datos** en el servidor mediante **esquemas Pydantic**
  (`app/schemas/*.py`), que reutilizan internamente las mismas reglas ya
  probadas del Frontend (`app/utils/validators.py`): tipos de dato,
  campos obligatorios, longitudes, expresiones regulares, formato de
  correo/documento/teléfono/contraseña e información de productos y
  servicios.
- Restricción de **CORS** al origen del Frontend (`FRONTEND_URL`).
- Nada de lo que dice la diapositiva del "Cuarto Avance" se publica en el
  repositorio: no hay contraseñas de base de datos, claves secretas,
  tokens ni información privada versionados — solo quedan en `.env`
  (ignorado por Git) y sus valores de ejemplo genéricos en `.env.example`.

## 7. Modelos y esquemas

El Backend diferencia claramente entre **modelos** (cómo se ven las tablas
en la base de datos) y **esquemas** (qué datos acepta y devuelve la API):

- **`app/models/`** → modelos ORM de SQLAlchemy que mapean las tablas ya
  creadas por `database/schema.sql` (`roles`, `usuarios`, `categorias`,
  `productos`, `servicios`). Los routers los usan para leer/escribir en
  la base de datos con `db.query(...)`, `db.add(...)`, `db.get(...)`,
  en vez de SQL escrito a mano.
- **`app/schemas/`** → esquemas Pydantic que validan el **body** de cada
  petición (tipos de dato, campos obligatorios, longitudes, formatos,
  correos, contraseñas, datos de productos y servicios) y dan forma a
  las respuestas (`response_model`), asegurando que la contraseña o su
  hash nunca se incluyan en lo que devuelve la API.

Cuando una validación de un esquema falla, un manejador global en
`app/main.py` traduce el error de Pydantic al mismo formato plano que ya
usa el resto de la API: `{ "mensaje": "...", "errores": [...] }`.

## 8. Estructura del proyecto

```
backend_fastapi/
├── app/
│   ├── main.py                 → punto de entrada (equivalente a server.js)
│   ├── config/
│   │   ├── settings.py         → variables de entorno
│   │   └── db.py               → conexión SQLAlchemy a MySQL + Base ORM
│   ├── middlewares/
│   │   └── auth.py             → require_auth / require_role (JWT)
│   ├── models/                 → modelos ORM (tablas de la base de datos)
│   │   ├── rol.py
│   │   ├── usuario.py
│   │   ├── categoria.py
│   │   ├── producto.py
│   │   └── servicio.py
│   ├── schemas/                → esquemas Pydantic (validación de la API)
│   │   ├── usuario.py
│   │   ├── auth.py
│   │   ├── producto.py
│   │   └── servicio.py
│   ├── routers/
│   │   ├── auth.py             → registro, login, perfil
│   │   ├── usuarios.py         → administración de usuarios
│   │   ├── productos.py        → catálogo de productos
│   │   └── servicios.py        → catálogo de servicios
│   └── utils/
│       ├── hash.py             → bcrypt
│       ├── jwt.py               → generación/verificación de JWT
│       ├── validators.py       → reglas de validación reutilizadas por los esquemas
│       └── respuestas.py       → helper de respuestas de error
├── database/schema.sql         → mismo esquema relacional de siempre
├── postman/                    → colección Postman heredada
└── requirements.txt
```

## 9. ¿Por qué el mismo contrato de API?

El objetivo de esta migración fue **evolucionar la arquitectura**, no
reinventar el producto. Por eso cada endpoint conserva la misma ruta, el
mismo verbo HTTP, los mismos nombres de campo en el cuerpo de la petición
(`nombre`, `numeroDocumento`, `claveAdmin`, etc.) y el mismo formato de
respuesta (`{ "mensaje": "...", ... }`). Así, el Frontend
(`frontend/src/services/api.js`) sigue funcionando sin ninguna
modificación, solo apuntando a este nuevo backend en FastAPI.

## 10. Módulo de pagos Wompi

El módulo de pagos está en `app/payments` y usa PostgreSQL separado (`PAYMENTS_DATABASE_URL`); las rutas existentes del negocio siguen usando MySQL/TiDB (`DATABASE_URL`). La cadena es `Router → PaymentService → PaymentRepository → PostgreSQL` y `PaymentService → PaymentProvider → Wompi Sandbox`. La API de pagos no requiere autenticación de usuario actualmente; antes de exponerla públicamente, protege consultas y creación con identidad/autorización y límites de uso. El webhook sí valida la firma de Wompi.

### Requisitos, variables y PostgreSQL

Requiere Python 3.12+, PostgreSQL 16 y las dependencias de `requirements.txt`. Copia el archivo de ejemplo de la raíz del repositorio y cambia la clave local:

```powershell
Copy-Item ..\.env.example ..\.env
```

En `.env`, configura `PAYMENTS_DATABASE_URL` con un DSN `postgresql+asyncpg`, `PAYMENT_ENV=sandbox`, `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` y `WOMPI_API_URL=https://sandbox.wompi.co/v1`. `APP_URL` es la URL de retorno al frontend. Nunca uses credenciales reales en archivos versionados. La configuración de PostgreSQL en local puede ser `postgresql+asyncpg://postgres:postgres@localhost:5432/payments`; en producción usa una instancia administrada con TLS.

Obtén llaves y secretos desde el Dashboard de comercios Wompi: Desarrollo → Programadores, activa Sandbox y consulta las llaves y secretos para integración técnica. Las llaves de prueba llevan prefijos `pub_test_` y `prv_test_`, y los secretos `test_events_` y `test_integrity_`. Mantén cada llave emparejada con su ambiente.

El pago se abre con Wompi Web Checkout (`https://checkout.wompi.co/p/`) y firma SHA-256 generada en backend. Se envían los parámetros documentados `public-key`, `currency`, `amount-in-cents`, `reference`, `signature:integrity`, `redirect-url` y `customer-data:*`. No se envían datos de tarjeta al backend. El ID de transacción llega en `transaction.updated`; el estado definitivo se valida con webhook y puede reconciliarse con `POST /sync`.

Los health checks son `GET /health`, que responde `{"status":"ok"}`, y `GET /health/db`, que valida PostgreSQL de pagos y responde HTTP 503 si no está disponible.

### Migraciones

Desde `backend_fastapi/`, crea/actualiza el esquema PostgreSQL de pagos:

```bash
alembic -c payments_alembic.ini upgrade head
```

Para revertir una revisión de pagos:

```bash
alembic -c payments_alembic.ini downgrade -1
```

La configuración separada mantiene el historial del módulo PostgreSQL aislado del Alembic legado MySQL/TiDB (`alembic.ini`). En Docker Compose, el servicio `migrate` aplica ambas migraciones al iniciar.

### Ejecución local y Docker

Opción recomendada para levantar API, MySQL legado y PostgreSQL de pagos:

```bash
docker compose up --build
```

La API queda en `http://localhost:8000`, Swagger en `http://localhost:8000/docs` y ReDoc en `http://localhost:8000/redoc`. Para ejecutar Python localmente, inicia PostgreSQL y MySQL con el esquema aplicado, instala las dependencias y usa:

```bash
python -m venv .venv
# Windows PowerShell: .venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
alembic -c payments_alembic.ini upgrade head
uvicorn app.main:app --reload --port 8000
```

### Probar en Swagger, Postman y pytest

En Swagger, abre `/docs`, ejecuta `POST /api/v1/payments` con `amount`, `currency=COP`, correo, nombre, descripción y `provider=wompi`. Copia `payment_id` y `reference` de la respuesta para consultar el pago. Las rutas disponibles son crear, consultar por UUID, consultar por referencia, sincronizar estado y recibir webhook. `Idempotency-Key` es opcional para la creación.

Importa `postman/Wompi_Payments.postman_collection.json` en Postman y selecciona el environment local o crea uno con `base_url=http://localhost:8000`, `payment_id` y `reference`. Ejecuta Create Payment primero; el script de colección llena esas dos variables automáticamente.

Para recibir webhooks en local, publica el puerto 8000 con un túnel HTTPS (por ejemplo ngrok) y registra `https://<host-publico>/api/v1/webhooks/wompi` en el Dashboard Sandbox. No uses un payload inventado en Postman como webhook exitoso: el checksum debe corresponder exactamente al contenido y secreto de eventos de Wompi. Puedes reenviar desde Postman un evento real capturado, conservando `signature.properties`, `timestamp`, `signature.checksum` y, si está presente, `X-Event-Checksum`.

Las pruebas usan mocks y no llaman a Wompi. Desde `backend_fastapi/`:

```bash
pytest
```

### Pasar a producción

Primero completa validaciones funcionales, firma webhook, migraciones y permisos de red. Cambia `PAYMENT_ENV=production`, `WOMPI_API_URL=https://production.wompi.co/v1` y reemplaza las cuatro credenciales/secretos por las credenciales productivas correspondientes. Configura una URL de webhook productiva independiente con HTTPS y una base PostgreSQL administrada con TLS/backups. No mezcles transacciones ni secretos de Sandbox con Producción; prueba la configuración en un despliegue restringido antes de habilitar cobros reales.

Referencias oficiales: [ambientes y llaves](https://docs.wompi.co/docs/colombia/ambientes-y-llaves/), [Web Checkout](https://docs.wompi.co/docs/colombia/widget-checkout-web/), [eventos y firma](https://docs.wompi.co/docs/colombia/eventos/) y [consulta de transacciones](https://docs.wompi.co/docs/colombia/transacciones/).



