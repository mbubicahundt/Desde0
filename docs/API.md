# API — LuxAuto (NestJS)

Base URL: `API_BASE_URL` (por defecto local: `http://localhost:3000`).

## Autenticación

La API usa JWT Bearer:

- Header: `Authorization: Bearer <token>`

Roles:

- `BUYER`
- `SELLER`

## Endpoints

### Base

- `GET /` → string simple (health básico).

### Auth

- `POST /auth/register`
  - Body: `{ email, password, role, name? }`
  - Response: `{ accessToken }`

- `POST /auth/login`
  - Body: `{ email, password }`
  - Response: `{ accessToken }`

- `GET /auth/me` (Auth)
  - Response: payload JWT (`{ sub, role, email, name? }`).

### Cars

- `GET /cars`
  - Query (principales): `brand`, `model`, `location`, `bodyType`, `transmission`, `priceMin`, `priceMax`, `yearMin`, `yearMax`, `mileageMax`, `page`, `limit`.
  - Response: `{ page, limit, items: DbCar[] }`.

- `GET /cars/:id`
  - Response: auto + `images` + `aiAnalysis`.

- `GET /cars/mine` (Auth + SELLER)
  - Response: `{ items: DbCar[] }`.

- `POST /cars` (Auth + SELLER)
  - Body: `CreateCarDto`.
  - Response: `DbCar`.

- `PATCH /cars/:id` (Auth + SELLER)
  - Body: `UpdateCarDto`.
  - Response: `DbCar`.

- `DELETE /cars/:id` (Auth + SELLER)
  - Response: `{ ok: true }`.

- `POST /cars/:id/images` (Auth + SELLER)
  - Multipart: campo `images` (hasta 10 archivos; jpeg/png/webp).
  - Response: `DbCarImage[]`.

### AI (Gemini)

- `POST /cars/:id/analyze` (Auth + SELLER)
  - Requiere que el auto tenga imágenes cargadas.
  - Response: registro de `car_ai_analysis`.

### Q&A

- `GET /cars/:id/questions`
  - Público.
  - Response: lista con `answer` o `null`.

- `POST /cars/:id/questions` (Auth + BUYER)
  - Body: `{ text }`
  - Response: `DbQuestion`.

- `POST /questions/:id/answer` (Auth + SELLER)
  - Body: `{ text }`
  - Response: `DbAnswer`.

- `PATCH /questions/:id/hide` (Auth + SELLER)
  - Response: `DbQuestion` actualizado.

### Notifications

- `GET /notifications` (Auth)
  - Query: `page`, `limit`
  - Response: listado paginado.

- `GET /notifications/unread-count` (Auth)
  - Response: `{ count }`.

- `PATCH /notifications/:id/read` (Auth)
  - Marca una notificación como leída.

## Errores

- Validaciones: 400 con `message`.
- Auth faltante/inválida: 401.
- Rol insuficiente: 403.
- Recursos inexistentes: 404.
