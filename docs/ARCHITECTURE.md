# Arquitectura — LuxAuto

## Vista general

- **Frontend**: sitio estático multipágina en HTML/CSS/JS vanilla (`frontend/src`).
- **Backend**: API REST en NestJS (`backend/src`).
- **Base de datos**: Railway Postgres (tablas/índices en `db/queries`).
- **Imágenes**: filesystem del backend (idealmente Railway Volume) servido en `/uploads/*`.
- **IA**: Gemini (Google Generative AI) para análisis de fotos del auto.
- **Deploy**: Backend en Railway, Frontend en Netlify.

## Componentes

### Frontend (Netlify)

- Páginas HTML: listado, detalle, autenticación, publicar, perfil, comparar.
- Lógica JS por vista + utilidades:
  - `frontend/src/js/api.js`: wrapper `fetch` con token JWT.
  - `frontend/src/js/auth.js`: gestión de token + sesión.
  - `frontend/src/js/partials.js`: inyección de navbar/footer por `fetch`.
  - `frontend/src/js/notifications.js`: polling (notificaciones in-app).
- Config runtime:
  - `frontend/src/js/config.js` define `window.__APP_CONFIG__.API_BASE_URL`.

### Backend (Railway)

Módulos NestJS principales:

- **AuthModule**: registro/login JWT.
- **CarsModule**: CRUD de autos + subida de imágenes.
- **AiModule**: análisis IA por auto (usa imágenes del auto).
- **QaModule**: preguntas públicas + respuesta/ocultar por vendedor.
- **NotificationsModule**: notificaciones in-app (polling desde frontend).
- **DatabaseModule**: conexión a Postgres vía `pg` (`DATABASE_URL`).

Seguridad y plataforma:

- `helmet` (headers)
- CORS allowlist por `CORS_ORIGINS`
- `ValidationPipe` (whitelist + transform)
- Rate limiting global con `@nestjs/throttler`

## Flujo de datos (alto nivel)

1. El vendedor crea una publicación (`POST /cars`) → se guarda en Postgres.
2. Sube fotos (`POST /cars/:id/images`) → se guarda en disco (uploads) → se guarda `car_images` en Postgres.
3. Dispara análisis IA (`POST /cars/:id/analyze`) → el backend lee imágenes desde disco → Gemini devuelve JSON → se guarda en `car_ai_analysis`.
4. Comprador navega listado/detalle (`GET /cars`, `GET /cars/:id`) y ve IA.
5. Comprador pregunta (`POST /cars/:id/questions`) → crea notificación al vendedor.
6. Vendedor responde/oculta (`POST /questions/:id/answer`, `PATCH /questions/:id/hide`) → crea notificación al comprador.
7. Frontend hace polling de notificaciones (`GET /notifications/unread-count`, `GET /notifications`).

## Variables de entorno (resumen)

- `DATABASE_URL`, `DATABASE_SSL`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `PUBLIC_BASE_URL`, `UPLOADS_DIR`
- `GEMINI_API_KEY`, `GEMINI_MODEL`, `DEFAULT_CURRENCY`
- `CORS_ORIGINS`
