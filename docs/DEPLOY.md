# Deploy checklist — Railway (API) + Netlify (Frontend)

## 0) Requisitos

- Node.js 18+ (backend y script de Netlify).
- Railway:
  - Plugin de **PostgreSQL** creado.
  - (Recomendado) Un **Volume** montado para persistir `UPLOADS_DIR`.

## 1) Variables de entorno (backend / Railway)

Setear en Railway estas variables (este backend ignora `.env` y lee solo variables del entorno):

- `PORT` (Railway suele setearlo; opcional)
- `NODE_ENV=production`

**CORS**
- `CORS_ORIGINS` (comma-separated)
  - Ejemplo: `https://tu-sitio.netlify.app,http://localhost:5173`
  - Aliases aceptados: `FRONTEND_ORIGINS`, `FRONTEND_URL`, `APP_URL`, `CORS_URL`

**DB (Railway Postgres)**
- `DATABASE_URL` (connection string de Railway)
- `DATABASE_SSL=true` (recomendado en servicios Postgres gestionados)
  - Alias aceptado: `DB_SSL=true`

**JWT**
- `JWT_SECRET` (string larga/aleatoria)
  - Alias aceptado: `JWT_SECRET_PASSWORD`
- `JWT_EXPIRES_IN=1h` (opcional)

**Uploads (filesystem)**
- `PUBLIC_BASE_URL` (URL pública del backend, ej: `https://<svc>.up.railway.app`)
  - Aliases aceptados: `BACKEND_PUBLIC_URL`, `BACKEND_URL`, `CORS_URL`, `APP_URL`
- `UPLOADS_DIR` (path del volumen montado, ej: `/app/uploads`)

**IA (Gemini)**
- `GEMINI_API_KEY`
- `GEMINI_MODEL` (opcional, default: `gemini-1.5-flash`)
- `DEFAULT_CURRENCY=USD` (opcional)
- `AI_MAX_IMAGES=3` (opcional)

**Límites de upload (opcional)**
- `MAX_IMAGE_COUNT=10`
- `MAX_IMAGE_SIZE_BYTES=5242880`

## 2) Railway (backend)

- Crear un servicio desde el repo.
- Configurar **Root Directory**: `backend`.
- Railway compila y arranca con `backend/nixpacks.toml`:
  - Build: `npm ci` + `npm run build`
  - Start: `npm run start:prod`

Verificación rápida:
- Abrir la URL pública del backend y chequear `GET /`.
- Abrir una imagen subida (si ya subiste) en `GET /uploads/...`.

## 2.1) Crear el schema en Railway Postgres

Railway te da un `DATABASE_URL`. Con cualquier cliente SQL (DBeaver, TablePlus, psql, etc.) conectate y ejecutá en orden:

1. `db/queries/000_extensions.sql`
2. `db/queries/001_tables.sql`
3. `db/queries/002_indexes.sql`
4. (opcional) `db/queries/010_seed_dev.sql`

Nota: `000_extensions.sql` crea la extensión `pgcrypto` (necesaria para `gen_random_uuid()`).

## 3) Netlify (frontend)

Este repo ya incluye `netlify.toml` para publicar `frontend/src` como sitio multipágina (no SPA).

### 3.1 Configurar API_BASE_URL sin editar archivos

Netlify corre un comando de build muy simple que escribe `frontend/src/js/config.js` en el deploy:

- Variable a setear en Netlify:
  - `NETLIFY_API_BASE_URL` → URL del backend Railway
    - Ejemplo: `https://mi-backend.up.railway.app`

Esto lo hace el script: `scripts/netlify-generate-config.mjs`.

### 3.2 CORS

Asegurate de agregar el origin de Netlify en `CORS_ORIGINS` del backend.

## 4) Validación end-to-end (smoke test)

### Flujo SELLER

1. `POST /auth/register` con `role=SELLER` → guardar token.
2. `POST /cars` → crear auto.
3. `POST /cars/:id/images` → subir 2–3 imágenes.
4. `POST /cars/:id/analyze` → verificar que guarda `car_ai_analysis`.

### Flujo BUYER

1. `POST /auth/register` con `role=BUYER`.
2. `GET /cars` + `GET /cars/:id`.
3. `POST /cars/:id/questions`.

### Q&A + Notificaciones

1. SELLER responde: `POST /questions/:id/answer`.
2. BUYER ve notificación: `GET /notifications/unread-count` y `GET /notifications`.

## 5) Notas comunes

- Si usás Deploy Previews en Netlify, el origin cambia. En esta API se usa allowlist estricta, así que hay que agregar cada origin que quieras permitir.
- Las imágenes se guardan en disco y se sirven por `/uploads/*`. En Railway necesitás un Volume para persistencia.
