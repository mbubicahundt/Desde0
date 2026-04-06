# Deploy checklist — Railway (API) + Netlify (Frontend)

## 0) Requisitos

- Node.js 18+ (backend y script de Netlify).
- Supabase:
  - Proyecto creado.
  - SQL ejecutado: `db/queries/000_extensions.sql`, `001_tables.sql`, `002_indexes.sql`.
  - Bucket público de Storage creado (ej: `car-images`).

## 1) Variables de entorno (backend / Railway)

Setear en Railway **exactamente** estas variables (equivalentes a `backend/.env.example`):

- `PORT` (Railway suele setearlo; opcional)
- `NODE_ENV=production`

**CORS**
- `CORS_ORIGINS` (comma-separated)
  - Ejemplo: `https://tu-sitio.netlify.app,http://localhost:5173`

**DB (Supabase Postgres)**
- `DATABASE_URL` (connection string de Supabase)
- `DATABASE_SSL=true` (recomendado con Supabase)

**JWT**
- `JWT_SECRET` (string larga/aleatoria)
- `JWT_EXPIRES_IN=1h` (opcional)

**Supabase Storage**
- `SUPABASE_URL` (ej: `https://xxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` (service role key)
- `SUPABASE_STORAGE_BUCKET=car-images`

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
- Las imágenes se suben a Supabase Storage; el bucket debe ser público para que la IA pueda descargarlas por URL.
