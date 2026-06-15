# Gatocafee — Proyecto

Breve guía para desarrollo local y acciones automáticas.

Requisitos:
- Node.js >= 18
- MongoDB (local) o acceso a Atlas

Desarrollo backend:

```bash
cd backend
# Copiar ejemplo de env y ajustar
cp .env.example .env
# Instalar dependencias
npm install
# Levantar servidor
npm run dev
```

Desarrollo frontend:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Scripts útiles:
- `node backend/scripts/run_login_test_local.js` — probar endpoint de login desde CLI.
- `node backend/scripts/inspect_collections.js` — listar colecciones en Atlas para diagnóstico.

Buenas prácticas:
- No subir `.env` al repositorio. Usa `.env.example` como plantilla.
- Ejecutar `npm audit` regularmente y revisar dependencias.

Roadmap de mejoras: ver `docs/improvements.md`.
# Gatocafee
Sistema de gestión para cafetería (backend + frontend).

## Estructura
- `backend/` - API REST (Express, MongoDB)
- `frontend/` - Frontend Next.js (app router)

## Variables de entorno
Rellenar `backend/.env` con las variables de `backend/.env.example`.
Rellenar `frontend/.env.local` o usar `frontend/.env.example`.

## Ejecutar localmente
### Backend
```
cd backend
npm install
npm run dev
```
### Frontend
```
cd frontend
npm install
npm run dev
```

## Subida de imágenes
- El backend soporta subir imágenes a Cloudinary si configuras las credenciales (ver `backend/.env.example`).
- También hay un fallback local para desarrollo en `frontend/public/images/`.

## Despliegue en Render (resumen)
1. Subir este repo a GitHub.
2. Crear dos servicios en Render: Backend (path `backend`) y Frontend (path `frontend`).
3. En Render, añadir variables de entorno en cada servicio:
   - Backend: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_URL` (o variables separadas), `FRONTEND_URL`.
   - Frontend: `NEXT_PUBLIC_API_URL=https://<backend>.onrender.com/api`.
4. Desplegar.

## Notas
- No subas `.env` al repo.
- Para subir imágenes a Cloudinary desde el frontend directamente, puedo implementar uploads firmados.
