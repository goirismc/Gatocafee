# Auditoría y mejoras recomendadas — Gatocafee

Este documento resume un análisis inicial y una lista priorizada de mejoras seguras y no invasivas, siguiendo las reglas de trabajo acordadas.

## Resumen ejecutivo

- Se corrigió la `MONGODB_URI` en `backend/.env` para apuntar a la BD `Gatocafee`.
- Se endureció `JWT_SECRET` y se deshabilitó `DEV_ALLOW_UNAUTH` por defecto.
- Se copiaron registros desde la BD literal `appName=Gatocafee` hacia `Gatocafee` sin borrar nada.

## Prioridad inmediata (riesgo bajo)

1. Añadir `.env.example` (hecho) para guiar la configuración local.
2. Añadir `.gitignore` y evitar subir `backend/.env` (hecho).
3. Validación temprana de variables críticas en `server.js` (hecho).
4. Añadir ESLint/Prettier config mínimos (hecho) — ejecutar y corregir manualmente.

## Fase 1 (Seguridad y estabilidad)

- Implementar almacenamiento de tokens en cookies HttpOnly (requiere coordinación frontend/backend).
- Añadir validación más estricta para inputs con `express-validator` en rutas críticas.
- Integrar Sentry para captura de errores en backend y frontend.

## Fase 2 (Robustez)

- Añadir tests unitarios y e2e (Jest + Playwright/Cypress).
- Introducir migraciones (migrate-mongo) y pruebas de rollback.

## Fase 3 (Rendimiento)

- Revisar índices MongoDB y añadir índices compuestos donde las consultas lo requieran.
- Cachear respuestas frecuentes (Redis) y usar CDN para assets.

## Tareas sugeridas de implementación inmediata (riesgo bajo)

1. Añadir `README.md` con comandos de desarrollo y deploy.
2. Añadir `backend/.env.example` y `frontend/.env.example` (hecho).
3. Ejecutar `npm audit` y actualizar dependencias no críticas.

---

Si querés, aplico automáticamente las tareas de riesgo bajo: ESLint config más extendido, `README.md` inicial, y un pipeline básico de CI que ejecute lint. Indica cuál preferís que empiece.
