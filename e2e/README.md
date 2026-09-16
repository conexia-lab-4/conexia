# E2E — Conexia

Pruebas end-to-end con Playwright sobre los flujos principales de Conexia.

## Setup

1. `cd e2e && npm install`
2. `npx playwright install --with-deps chromium`
3. Copiá `.env.example` a `.env` y completá:
   - `E2E_BASE_URL`: URL del ambiente a testear (local, preview de Vercel, o producción)
   - `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`: credenciales de un usuario de prueba dedicado en Firebase (nunca un usuario real). Creá este usuario a mano en la consola de Firebase (Authentication → Add user) — no se versiona ni se genera automáticamente.

## Correr los tests

- `npm run test:e2e` — headless
- `npm run test:e2e:ui` — modo interactivo
- `npm run test:e2e:headed` — con navegador visible
- `npm run test:e2e:report` — abre el último reporte HTML

## Estrategia de datos de prueba

Cada test es responsable de crear y limpiar sus propios datos (por ejemplo: alta de materia → asserts → eliminarla al final del test), en vez de depender de un seed fijo en la base compartida. Esto evita que los tests queden acoplados al estado de una DB que puede cambiar, y permite correrlos en paralelo sin que se pisen entre sí.

## Autenticación

El proyecto `setup` (`tests/auth.setup.ts`) hace login una sola vez contra Firebase con el usuario de prueba y guarda la sesión en `.auth/user.json` (gitignorado). El resto de los tests reutiliza esa sesión mediante `storageState`, evitando loguearse en cada test. No hay tokens ni contraseñas hardcodeadas en el código: todo sale de variables de entorno (`.env`, gitignorado).

Los tests que no necesitan sesión (como `smoke.spec.ts`) la ignoran explícitamente con `test.use({ storageState: { cookies: [], origins: [] } })`.

## CI

El config detecta `process.env.CI` automáticamente (retries, workers, modo headless). Falta agregar el step de GitHub Actions cuando se decida integrar E2E al pipeline — queda fuera del alcance de este ticket.
