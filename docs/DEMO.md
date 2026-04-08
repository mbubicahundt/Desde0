# Demo / Defensa — LuxAuto

Objetivo: mostrar registro, publicación, búsqueda, análisis IA y flujo Q&A + notificaciones.

## Pre-check (5 min)

- Railway Postgres
  - Ejecutado `db/queries/000_extensions.sql`, `001_tables.sql`, `002_indexes.sql`.
- Railway Volume (uploads)
  - `UPLOADS_DIR` apunta al mount path del volumen.
  - `PUBLIC_BASE_URL` es la URL pública del backend.
- Backend
  - Variables cargadas (ver `backend/.env.example`).
  - `CORS_ORIGINS` incluye el origin del frontend (Netlify o local).
- Frontend
  - `frontend/src/js/config.js` apunta al backend (Railway o local).

## Guión recomendado (10–12 min)

1) **Registro SELLER**
- Registrarse como `SELLER`.
- Entrar al perfil.

2) **Publicar auto + fotos**
- Crear un auto (marca/modelo/año/km/ubicación/precio/descripcion).
- Subir 2–3 fotos.

3) **Análisis IA**
- Ejecutar “Analizar con IA”.
- Mostrar el JSON normalizado (condición + resumen + rango de precio).

4) **Vista pública / comprador**
- Abrir en incógnito o logout.
- Buscar por marca/modelo y abrir el detalle.
- Agregar 2–4 autos al comparador y abrir la comparación.

5) **Q&A + notificaciones**
- Loguear como `BUYER`.
- Crear una pregunta en el detalle del auto.
- Loguear como `SELLER`.
- Mostrar notificación in-app (polling) y responder/ocultar.
- Volver a `BUYER` y mostrar la notificación + respuesta en la vista pública.

## Tips de presentación

- Usar fotos con daños visibles para que el análisis sea creíble.
- Mantener el foco en: seguridad (roles), IA y valor para el usuario.
