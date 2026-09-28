# Ely Marquez · Evolución a Full Stack con FastAPI

Este proyecto evoluciona el Tercer Avance (React + Vite / Node.js + Express)
hacia una arquitectura Full Stack con **FastAPI (Python)** en el backend,
**conservando intacto todo lo desarrollado en el Frontend**.

```
proyecto/
├── frontend/          → React + Vite (SIN CAMBIOS respecto al avance anterior)
└── backend_fastapi/   → Python + FastAPI + MySQL (nuevo backend)..
```

## Qué se conservó del proyecto original

- La interfaz desarrollada con **React + Vite**.
- Los **componentes reutilizables** (`components/ui/Input.jsx`, `Button.jsx`, `Select.jsx`, `Modal.jsx`, etc.).
- **Tailwind CSS**.
- El **formulario de registro** (`pages/Register.jsx`, `components/RegisterModal.jsx`).
- El **formulario de inicio de sesión** (`pages/Login.jsx`).
- El **módulo de recuperación de contraseña** (`components/RecoverPassword.jsx`, `pages/RecoverPasswordPage.jsx`).
- Las **validaciones** desarrolladas previamente en el Frontend (`utils/validators.js`), replicadas 1:1 en el backend.
- El **Navbar/Header** (`components/Header.jsx`).
- El **Footer** (`components/Footer.jsx`).
- El **carrusel** (`components/Carousel.jsx`) y demás componentes propios del proyecto.
- El **botón flotante de WhatsApp** (`components/WhatsAppButton.jsx`).
- Todas las **páginas y funcionalidades** desarrolladas anteriormente (`Home`, `Productos`, `AboutUs`, `Contact`, `Panel`, contexto de autenticación, rutas protegidas, etc.).

**Ni un solo archivo del Frontend fue modificado.** Solo cambió el backend
al que se conecta.

## Qué cambió: el backend

| | Antes (Node.js) | Ahora (FastAPI) |
|---|---|---|
| Lenguaje / framework | Node.js + Express | Python + FastAPI |
| Base de datos | MySQL (mysql2) | MySQL (SQLAlchemy) — **mismo esquema** |
| Autenticación | JWT (jsonwebtoken) | JWT (python-jose) |
| Hash de contraseñas | bcryptjs | bcrypt |
| Rutas de la API | `/api/...` | **Las mismas `/api/...`, sin cambios** |
| Formato de respuesta | `{ "mensaje": "..." }` | **El mismo formato, campo por campo** |

El contrato de la API (rutas, verbos HTTP, nombres de campos, formato de
respuestas) se conservó exactamente igual, por lo que el archivo
`frontend/src/services/api.js` sigue funcionando sin ninguna modificación.

## Cómo ejecutar el proyecto

### 1. Base de datos

1. Tener MySQL 8+ (o MariaDB 10.4+) corriendo localmente.
2. Ejecutar el script `backend_fastapi/database/schema.sql` (el mismo
   esquema relacional de siempre) para crear la base de datos, las tablas
   y los datos iniciales (roles, permisos, categorías).

### 2. Backend (FastAPI)

```bash
cd backend_fastapi
cp .env.example .env    # Ajusta las credenciales de tu MySQL local
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 4000
```

### 3. Frontend (React + Vite) — sin cambios

```bash
cd frontend
npm install
npm run dev              # Levanta la app en http://localhost:5173
```

Por defecto el frontend consulta la API en `http://localhost:4000/api`
(configurable mediante la variable de entorno `VITE_API_URL`), que es
exactamente el mismo puerto en el que ahora corre FastAPI.

## Flujo de registro (Formulario → FastAPI → Base de datos)

```
Formulario React (frontend/src/pages/Register.jsx)
   ↓ validación en el cliente (frontend/src/utils/validators.js)
Endpoint FastAPI  POST /api/auth/register
   ↓ validación en el servidor (backend_fastapi/app/utils/validators.py)
Hash de la contraseña (bcrypt)
   ↓
Base de datos MySQL (tabla `usuarios`)
   ↓
Respuesta del servidor (JSON, mismo formato de siempre)
   ↓
Frontend (mensaje de éxito y redirección a /login)
```

Cada carpeta (`frontend/` y `backend_fastapi/`) tiene su propio
`README.md` con más detalle.

## Quinto avance: ventas, facturaci�n y dashboard

Para actualizar una base existente, vuelve a ejecutar `backend_fastapi/database/schema.sql`; el script agrega `facturas` y `pqrs` adem�s de las tablas de ventas. Instala las dependencias del backend con `pip install -r backend_fastapi/requirements.txt` para habilitar la exportaci�n XLSX (`openpyxl`).

El panel administrativo incluye indicadores consolidados y acceso al historial de ventas y facturas. El reporte diario se descarga como PDF o Excel; cada venta genera una factura con n�mero consecutivo basado en el identificador de la venta. Las facturas se pueden filtrar por n�mero, cliente y fecha, y descargar en PDF. Los clientes autenticados pueden registrar PQR en `POST /api/pqrs`; el dashboard muestra total y pendientes.

El dashboard de ventas (`GET /api/dashboard/ventas`) ofrece agregaciones diarias, semanales o mensuales y acepta filtros por rango de fechas, producto, servicio, estado y cliente. La respuesta restringe autom�ticamente las consultas de clientes a sus propias compras; administraci�n y empleados consultan seg�n sus permisos. El Frontend dibuja Cards, barras y l�nea con esos datos din�micos.

## PQR y asistente virtual

El cliente registra y consulta sus PQR en el panel; los roles de administraci�n y empleado revisan y actualizan estados. El sitio incorpora un asistente conectado a `POST /api/chatbot/message`. Cuando `OPENAI_API_KEY` est� configurada en el backend, usa el modelo establecido por `OPENAI_MODEL`; sin clave responde con una gu�a FAQ y el cat�logo activo. Consulta `DEPLOY.md` para preparar los servicios Docker y Railway.
