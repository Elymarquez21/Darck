# Despliegue en Vercel y TiDB Cloud Starter

## Diseño y límites

El frontend Vite y el backend FastAPI se despliegan en un único proyecto de Vercel Services. El navegador usa `/api/...` en el mismo dominio; el rewrite interno enruta esas llamadas al backend, por lo que el despliegue normal no necesita CORS. Las llamadas locales conservan el origen explícito configurado por `FRONTEND_URL`.

Vercel Services aún puede requerir habilitación de acceso beta en el proyecto. En Vercel, configura el framework del proyecto como **Services** y confirma que su cuenta tenga acceso antes de conectar producción. Si esa función no está habilitada, el diseño de proyecto único queda bloqueado; no hay despliegue de dos servicios configurado aquí.

Vercel ejecuta FastAPI en su runtime Python con Fluid Compute. El backend no abre una conexión al importar o iniciar la aplicación; SQLAlchemy abre la conexión al atender la primera consulta. El pool está limitado a una conexión por instancia. Esto reduce el trabajo de arranque y el consumo de conexiones, pero no elimina el cold start del runtime ni la reactivación de TiDB. No existe una forma gratuita garantizada de mantenerlo caliente. No hay cron de warm-up porque los cron de GitHub pueden desactivarse tras 60 días sin actividad.

El endpoint `/api/health` ejecuta `SELECT 1`. El workflow espera hasta diez veces con pausa creciente para dar tiempo a TiDB Serverless a reactivarse. Si las migraciones fallan, el job `migrate` falla y el deploy no comienza. Las migraciones ocurren antes de publicar el nuevo código, por lo que los cambios de esquema futuros deben ser compatibles con el código previo durante esa ventana.

El baseline Alembic inicial toma el DDL y las semillas idempotentes de `backend_fastapi/database/schema.sql`. El primer `upgrade head` registra la versión también en bases existentes, usando `CREATE TABLE IF NOT EXISTS`. Su downgrade es deliberadamente irreversible: recuperar una copia de seguridad es más seguro que borrar tablas y datos.

Al validar TiDB, revisa específicamente claves foráneas y reglas `ON DELETE`, enums, triggers/procedimientos (el esquema actual no define triggers ni procedimientos), y el comportamiento de `AUTO_INCREMENT` distribuido. TiDB puede asignar identificadores con saltos; no dependas de que sean consecutivos. El workflow de CI puede probar las migraciones contra una base TiDB separada mediante `TIDB_TEST_DATABASE_URL`.

El plan Hobby de Vercel es para uso personal/no comercial. Si el proyecto se vuelve comercial, revisa el plan aplicable antes de continuar. No se configura ahora un plan de pago.

## Valores y secretos

GitHub Actions usa estos secretos (Settings → Secrets and variables → Actions):

| Secreto | Valor |
|---|---|
| `VERCEL_TOKEN` | Token de Vercel creado desde Account Settings → Tokens. |
| `VERCEL_ORG_ID` | ID del equipo/cuenta, tomado de `.vercel/project.json` tras enlazar el proyecto localmente. |
| `VERCEL_PROJECT_ID` | ID del proyecto, del mismo archivo. |
| `TIDB_TEST_DATABASE_URL` | URL de conexión de una base TiDB de prueba aislada; CI ejecuta Alembic allí. |
| `TIDB_PRODUCTION_DATABASE_URL` | URL de conexión de la base productiva; solo el workflow de producción la usa para migrar. |
| `PAYMENTS_DATABASE_URL` | URL de conexión PostgreSQL productiva usada por el módulo de pagos; también se configura como variable runtime de Production en Vercel. |

Las dos URLs TiDB deben tener formato `mysql+pymysql://...` y apuntar a bases separadas. `DATABASE_SSL_VERIFY=true` activa `ssl_verify_cert` y `ssl_verify_identity` en la URL compartida de SQLAlchemy/PyMySQL; no hace falta guardar un certificado CA propio para certificados públicos de TiDB.

En Vercel → Project → Settings → Environment Variables configura para **Production** y **Preview**:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL TiDB del ambiente correspondiente. Preview debe apuntar a una base o esquema separado de producción. |
| `PAYMENTS_DATABASE_URL` | URL PostgreSQL del ambiente; Preview debe usar una base PostgreSQL separada de producción y tener las migraciones aplicadas. |
| `DATABASE_SSL_VERIFY` | `true` |
| `SECRET_KEY` | Secreto aleatorio largo distinto del valor de ejemplo. |
| `ADMIN_REGISTRATION_CODE` | Código privado para el registro administrativo, si se usa esa función. |
| `OPENAI_API_KEY` | Opcional; solo necesaria para habilitar el proveedor de IA del chatbot. |
| `OPENAI_MODEL` | Opcional; por defecto `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | Opcional; por defecto `https://api.openai.com/v1`. |
| `VITE_API_URL` | `/api` para compilación de producción y preview. |

`ALGORITHM` y `ACCESS_TOKEN_EXPIRE_MINUTES` tienen valores predeterminados en el backend. No configures `FRONTEND_URL` en Vercel para CORS: ambas partes comparten origen. Nunca guardes URLs con credenciales en el repositorio, en `.env.example`, ni en logs públicos.

## Configuración inicial, una sola vez

1. Crea un repositorio GitHub `elymar35/<nombre-del-repositorio>` con `proyecto_final/` como raíz del repositorio y rama `main`. La visibilidad puede ser pública o privada; con repo privado considera el límite mensual de minutos de Actions.
2. Sube el contenido y confirma que workflows estén bajo `.github/workflows/` en la raíz.
3. Crea un cluster TiDB Cloud Starter de prueba y otro de producción. Habilita el acceso de red que permita GitHub Actions y Vercel. Copia las URLs de conexión MySQL, pero guárdalas solo en los secretos/variables indicados.
4. En GitHub crea `TIDB_TEST_DATABASE_URL`, `TIDB_PRODUCTION_DATABASE_URL` y `PAYMENTS_DATABASE_URL`. La base TiDB de prueba debe estar aislada; PostgreSQL debe ser una instancia/DB independiente administrada fuera de Vercel.
5. Crea un proyecto Vercel enlazado al repo. Configura el root del proyecto en la raíz del repositorio y framework **Services**; solicita/habilita acceso a Services si la consola lo requiere.
6. En Vercel crea las variables runtime de Production y Preview. Configura bases TiDB y PostgreSQL separadas; nunca compartas la base de producción con los previews. Aplica una vez `alembic -c payments_alembic.ini upgrade head` contra la PostgreSQL de Preview, y repite al introducir revisiones nuevas.
7. En Vercel desconecta el auto-deploy de la integración Git (o configura Ignored Build Step para ignorar todos los commits). Los PR conservan Preview Deployments nativos si la integración los genera; no añadas variables Preview que apunten a producción.
8. Genera un token Vercel y añade `VERCEL_TOKEN` a GitHub. Enlaza el proyecto desde una copia local con `vercel link`; copia `orgId` y `projectId` de `.vercel/project.json` a `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` en GitHub.
9. En GitHub crea un environment llamado `production` y guarda en él los secretos productivos. Habilita protección de rama para que `main` solo reciba cambios aprobados.
10. Ejecuta el primer despliegue por merge a `main`. El workflow migrará TiDB antes del deploy y comprobará `/api/health` después. Si hay tablas preexistentes, el baseline es idempotente y registra la versión de Alembic.

## Operación recurrente

- Pull request: Actions ejecuta solo los chequeos de las rutas cambiadas; Vercel puede generar un Preview Deployment desde su integración Git.
- Merge a `main`: Actions repite lint, tests y validación OpenAPI, aplica migraciones productivas y despliega ambos servicios juntos. El deploy se cancela si falla cualquier migración.
- Para un cambio futuro de esquema, añade una revisión Alembic nueva. Mantén el patrón expand/contract para evitar incompatibilidad entre el esquema migrado y el código que aún está activo.
- Revisa los registros de Actions si falla el health check. El chequeo tiene hasta diez intentos con timeout HTTP de 20 segundos y backoff creciente; si expira, el deployment está publicado pero el workflow queda rojo y requiere corregir la causa.
