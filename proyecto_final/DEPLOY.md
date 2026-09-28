# Publicar en Railway

La aplicación está preparada para desplegar sus servicios por separado:

- `backend_fastapi/`: FastAPI en Docker, health check `/api/health`.
- `frontend/`: React/Vite compilado como sitio estático servido por Nginx.
- Base de datos MySQL administrada por Railway.

## Configurar el proyecto

1. Sube este proyecto a un repositorio Git remoto y crea en Railway un servicio MySQL.
2. Crea el servicio FastAPI desde el repositorio, con root directory `/backend_fastapi` y archivo de configuración `/backend_fastapi/railway.toml`.
3. Configura en el backend las variables `DATABASE_URL` (referencia a la URL MySQL), `SECRET_KEY` (secreto aleatorio propio), `FRONTEND_URL` y, si usarás IA, `OPENAI_API_KEY`. `OPENAI_MODEL` y `OPENAI_BASE_URL` tienen valores predeterminados documentados en `.env.example`.
4. Crea el servicio web desde el mismo repositorio, con root directory `/frontend` y archivo de configuración `/frontend/railway.toml`. Define `VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}/api` antes de compilar.
5. Genera el dominio público de ambos servicios. Configura `FRONTEND_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}` en FastAPI y vuelve a desplegar el backend.
6. Ejecuta `backend_fastapi/database/schema.sql` en la base MySQL de Railway antes de usar las funciones de ventas, facturas y PQR.
7. Abre el dominio del frontend y verifica inicio de sesión, PQR, chatbot, ventas y reportes. Guarda capturas de esas pantallas y del endpoint `/api/health` como evidencias.

Los valores `OPENAI_API_KEY`, `SECRET_KEY` y `DATABASE_URL` deben cargarse en el gestor de variables de Railway, nunca en el repositorio. El `.env.example` solo contiene marcadores y valores públicos de configuración.

El repositorio local necesita un remoto Git y Railway necesita una sesión/proyecto autorizado para completar la publicación y obtener los dominios reales. No se incluyen credenciales de publicación en este código.
