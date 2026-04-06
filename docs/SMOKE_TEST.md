# Smoke test (Railway/Local)

Este smoke test valida los flujos principales del backend:

- Auth: register/login/me
- Cars: create/list/detail
- Upload: `multipart/form-data`
- AI: analyze (si hay imágenes)
- Q&A: pregunta + respuesta
- Notifications: unread-count + list

## Ejecutar (PowerShell)

Recomendado usar `curl.exe` (evita el alias `curl` de PowerShell).

### 1) Backend local

```powershell
cd "c:\Users\mirko\Desktop\Desde 0"
cd backend
npm run start:dev
```

En otra terminal:

```powershell
cd "c:\Users\mirko\Desktop\Desde 0"
.\scripts\smoke-test.ps1 -BaseUrl "http://localhost:3000"
```

### 2) Backend Railway

```powershell
cd "c:\Users\mirko\Desktop\Desde 0"
.\scripts\smoke-test.ps1 -BaseUrl "https://TU-BACKEND.up.railway.app"
```

### 3) Con imágenes (para probar upload + IA)

```powershell
.\scripts\smoke-test.ps1 `
  -BaseUrl "https://TU-BACKEND.up.railway.app" `
  -ImagePath1 "C:\\ruta\\foto1.jpg" `
  -ImagePath2 "C:\\ruta\\foto2.jpg"
```

## Notas

- Si `register` falla por email existente, el script continúa y usa `login`.
- El análisis IA puede fallar si no hay imágenes o si no está configurado `GEMINI_API_KEY`.
- Para que IA pueda descargar imágenes, el bucket de Supabase Storage debe ser público.
