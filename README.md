# LuxAuto — Plataforma Inteligente de Autos Usados

Proyecto fullstack (Frontend Vanilla + Backend NestJS) con Supabase (Postgres + Storage) e integración IA (Gemini Vision) para analizar fotos del vehículo.

Documentación:

- Arquitectura: `docs/ARCHITECTURE.md`
- Endpoints: `docs/API.md`
- Guión de demo: `docs/DEMO.md`
- Deploy checklist: `docs/DEPLOY.md`
- Smoke test: `docs/SMOKE_TEST.md`

## Estructura

- `frontend/src/` — HTML/CSS/JS vanilla (multipágina)
- `backend/` — API REST NestJS
- `db/queries/` — scripts SQL para Supabase

## Base de datos (Supabase)

1. Crear un proyecto en Supabase.
2. Abrir **SQL Editor** y ejecutar en orden:
   - `db/queries/000_extensions.sql`
   - `db/queries/001_tables.sql`
   - `db/queries/002_indexes.sql`
   - (opcional) `db/queries/010_seed_dev.sql`
3. Crear un bucket público en Supabase Storage (por ejemplo `car-images`).

## Backend (local)

Requiere Node.js 18+.

1. Entrar a `backend/` e instalar:
   - `npm install`
2. Copiar variables:
   - copiar `backend/.env.example` a `backend/.env` y completar.
3. Levantar en dev:
   - `npm run start:dev`

Variables importantes:
- `DATABASE_URL` (Supabase Postgres)
- `JWT_SECRET`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
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
