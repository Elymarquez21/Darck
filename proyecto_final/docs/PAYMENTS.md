# Módulo de pagos

## Arquitectura y alcance

El módulo vive en `backend_fastapi/app/payments` y se conecta al backend con routers delgados. Los routers validan HTTP y delegan a `PaymentService`; el servicio aplica reglas de estados y coordina proveedor/repositorio; el repositorio consulta PostgreSQL mediante SQLAlchemy async.

Este repositorio existente usa TiDB/MySQL para sus funciones actuales. Para respetar la especificación PostgreSQL sin cambiar la base de los módulos existentes, pagos tiene `PAYMENTS_DATABASE_URL` y un `Base` ORM separado. El backend puede utilizar las dos conexiones a la vez. Esta decisión requiere una instancia PostgreSQL independiente en producción; Vercel Functions no aloja PostgreSQL. El workflow de producción aborta antes del deploy si falta o falla `PAYMENTS_DATABASE_URL`.

`WompiClient` es el primer adaptador. `payment_factory.py` es el punto para agregar implementaciones Mercado Pago, ePayco, PayU o Stripe. Las credenciales no pasan por el router ni por las respuestas.

El checkout usa el formulario Web Checkout alojado por Wompi en https://checkout.wompi.co/p/. El backend construye únicamente los campos documentados (llave pública, moneda, monto en centavos, referencia, firma de integridad, URL de retorno y datos del cliente); no envía un token de aceptación, que corresponde a la creación de transacciones por API. El ID de transacción de Wompi llega después en transaction.updated; por eso /sync responde 409 hasta recibir ese webhook firmado.

Wompi usa dos secretos distintos: `WOMPI_INTEGRITY_SECRET` firma el checkout, y `WOMPI_EVENTS_SECRET` valida webhooks. La verificación del webhook calcula SHA-256 con las propiedades nombradas y ordenadas por Wompi, timestamp y secreto, y compara checksum de forma constante. Se comprueba también ambiente, referencia, monto y moneda antes de cambiar el pago.

Los estados se cambian mediante `transition_payment`. Los estados finales no retroceden a `PENDING` ni cambian ante notificaciones tardías contradictorias. Las transiciones están en un solo punto.

## API

- `POST /api/v1/payments`: crea registro `PENDING`, genera referencia y URL Wompi Sandbox. Acepta `Idempotency-Key` opcional; una repetición idéntica devuelve el pago existente y reutilizar la clave con otro cuerpo retorna conflicto.
- `GET /api/v1/payments/{payment_id}`: devuelve información pública de pago.
- `GET /api/v1/payments/reference/{reference}`: consulta por referencia.
- `POST /api/v1/payments/{payment_id}/sync`: consulta el ID de transacción guardado a Wompi y aplica transición válida.
- `POST /api/v1/webhooks/wompi`: valida estructura, firma, ambiente y datos del pago; registra el evento idempotentemente y actualiza el pago asociado.

El monto de entrada se expresa en unidades principales de la moneda (por ejemplo, 50000 COP). Wompi recibe `amount_in_cents`, calculado como monto por 100. Solo se admite COP en el adaptador actual. La respuesta pública no incluye correo, nombre, `raw_response`, datos del webhook ni credenciales.

## Configuración local

1. Copia `.env.example` a `.env` y cambia `SECRET_KEY`; completa las credenciales sandbox de Wompi en `.env` si quieres crear checkouts.
2. Inicia la API, MySQL heredado y PostgreSQL. Compose aplica ambas migraciones antes de iniciar la API:

   ```bash
   docker compose up --build
   ```

3. La API queda en `http://localhost:8000`, Swagger en `/docs` y ReDoc en `/redoc`. Para aplicar revisiones nuevas manualmente:

   ```bash
   docker compose run --rm migrate alembic -c payments_alembic.ini upgrade head
   ```

   Para retroceder una revisión de pagos:

   ```bash
   docker compose run --rm migrate alembic -c payments_alembic.ini downgrade -1
   ```

4. Configura en el dashboard Sandbox de Wompi el webhook público `https://<host>/api/v1/webhooks/wompi`. Wompi exige HTTPS para eventos.

Los nombres de base y contraseñas por defecto del compose son locales y falsos. No uses esos valores en producción.

## Migraciones y despliegue

Las revisiones de pagos viven en `backend_fastapi/app/payments/migrations/`; se ejecutan con `alembic -c payments_alembic.ini upgrade head`. La CI crea PostgreSQL 16 temporal, aplica las migraciones de pagos y ejecuta las pruebas unitarias. En producción, GitHub Actions migra PostgreSQL y TiDB antes de invocar Vercel CLI; cualquier fallo detiene el deploy.

Añade `PAYMENTS_DATABASE_URL` como secreto GitHub para que el job de producción migre PostgreSQL, y como variable **Production** de Vercel para que la API use la misma instancia. En Vercel crea además `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`, `PAYMENT_ENV=sandbox`, `WOMPI_API_URL=https://sandbox.wompi.co/v1` y `APP_URL` (la ruta de frontend que recibe el retorno, por ejemplo `/payment-return`). Las llaves y secretos sandbox deben provenir del dashboard Sandbox de Wompi. No reuses estos valores al habilitar producción.

GitHub Actions no comparte secretos con PR de forks; por eso la prueba real opcional de TiDB omite ese acceso en forks. Las pruebas locales no requieren credenciales de Wompi ni conectividad a las bases.

## Notas de seguridad y operación

- Usa una instancia PostgreSQL gestionada con TLS, backups y acceso de red limitado para producción. No coloques el servicio PostgreSQL dentro del runtime de Vercel.
- El webhook es la fuente asíncrona del ID real de transacción. `/sync` consulta a Wompi y nunca acepta estados enviados por el cliente.
- La tabla `payment_webhook_events` deduplica el checksum firmado; una restricción única de PostgreSQL protege `Idempotency-Key`.
- `reference` tiene una parte aleatoria de 48 bits y restricción única. Trata las URLs de pago como datos sensibles: contienen parámetros de checkout.
- El payload de webhook y la respuesta del proveedor se guardan para auditoría; limita su retención y el acceso al rol de base de datos.
- Los errores de pagos tienen una estructura JSON estable. Los logs son JSON y omiten tokens, claves, CVV y números completos de tarjeta.
- Los pagos son públicos por identificador/referencia porque este módulo no añade autenticación del negocio existente. Antes de habilitar el sitio a clientes, protege consultas de pago con sesión de usuario o un token opaco de seguimiento y aplica límites de creación por identidad/IP.
