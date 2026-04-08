# LuxAuto — Plataforma Inteligente de Autos Usados

Proyecto fullstack (Frontend Vanilla + Backend NestJS) con PostgreSQL (Railway) e integración IA (Gemini Vision) para analizar fotos del vehículo.

Documentación:

- Arquitectura: `docs/ARCHITECTURE.md`
- Endpoints: `docs/API.md`
- Guión de demo: `docs/DEMO.md`
- Deploy checklist: `docs/DEPLOY.md`
- Smoke test: `docs/SMOKE_TEST.md`

## Estructura

- `frontend/src/` — HTML/CSS/JS vanilla (multipágina)
- `backend/` — API REST NestJS
- `db/queries/` — scripts SQL para PostgreSQL (Railway)

## Base de datos (Railway Postgres)

1. Crear un plugin de **PostgreSQL** en Railway.
2. Conectarse al Postgres (Railway CLI o cliente SQL) y ejecutar en orden:
   - `db/queries/000_extensions.sql`
   - `db/queries/001_tables.sql`
   - `db/queries/002_indexes.sql`
   - (opcional) `db/queries/010_seed_dev.sql`

## Backend (local)

Requiere Node.js 18+.

1. Entrar a `backend/` e instalar:
   - `npm install`
2. Copiar variables:
   - copiar `backend/.env.example` a `backend/.env` y completar.
3. Levantar en dev:
   - `npm run start:dev`

Variables importantes:
- `DATABASE_URL` (Railway Postgres)
- `JWT_SECRET`
- `PUBLIC_BASE_URL` (URL pública del backend; se usa para generar URLs de imágenes)
- `UPLOADS_DIR` (directorio donde se guardan imágenes; en Railway usar Volume)
- `GEMINI_API_KEY`
- `CORS_ORIGINS` (lista separada por comas)

## Frontend (local)

El frontend es estático. Servilo con cualquier servidor HTTP.

Ejemplos:
- VS Code Live Server (recomendado)
- o `npx http-server frontend/src -p 5173`

Config de API:
- editar `frontend/src/js/config.js` y apuntar `API_BASE_URL` al backend.

## Deploy

### Backend en Railway

- Crear un servicio desde este repo.
- Seleccionar **Root Directory**: `backend`
- Setear variables de entorno igual que en `.env` (Railway no usa `.env` por defecto).
- Comando sugerido:
  - Build: `npm run build`
  - Start: `npm run start:prod`

Uploads:
- Montar un **Volume** y setear `UPLOADS_DIR` al path del mount.
- Setear `PUBLIC_BASE_URL` a la URL pública del backend (Railway).

CORS:
- Agregar la URL de Netlify a `CORS_ORIGINS` (ej: `https://tu-sitio.netlify.app`).
- Si usás Deploy Previews de Netlify, cada preview tiene otra URL y también debe estar en allowlist (no hay wildcard en el backend).

### Frontend en Netlify

- Deploy del repo
- `netlify.toml` ya publica `frontend/src` (frontend multipágina: **no** usar redirects tipo SPA)
- Importante: antes de deploy, apuntar `frontend/src/js/config.js` al backend de Railway.

## Flujos principales

- Comprador: registrarse → buscar/listar → ver detalle → preguntar → comparar (hasta 4).
- Vendedor: registrarse como SELLER → publicar (fotos + IA) → editar/eliminar publicación → responder/ocultar preguntas.
