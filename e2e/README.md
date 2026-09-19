# E2E — Conexia

Pruebas end-to-end con Playwright sobre los flujos principales de Conexia.

## Setup

1. `cd e2e && npm install`
2. `npx playwright install --with-deps chromium`
3. Copiá `.env.example` a `.env` y completá:
   - `E2E_BASE_URL`: URL del ambiente a testear (local, preview de Vercel, o producción)
   - `E2E_API_BASE_URL`: URL del backend NestJS del mismo ambiente (para los endpoints `/test-utils/*`)
   - `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`: credenciales de un usuario de prueba dedicado en Firebase (nunca un usuario real). Creá este usuario a mano en la consola de Firebase (Authentication → Add user) — no se versiona ni se genera automáticamente. Este usuario debe tener el email ya verificado en Firebase.
4. En el backend, seteá `E2E_TESTING=true` en el ambiente contra el que van a correr los tests (nunca en producción). Habilita los endpoints usados para verificar emails y resetear perfiles sin intervención manual (ver más abajo).

## Correr los tests

- `npm run test:e2e` — headless
- `npm run test:e2e:ui` — modo interactivo
- `npm run test:e2e:headed` — con navegador visible
- `npm run test:e2e:report` — abre el último reporte HTML

El config levanta automáticamente el frontend (`npm run dev` en `frontend/`) si no está corriendo ya en `E2E_BASE_URL`, así que no hace falta arrancarlo a mano. El backend sí hay que levantarlo aparte (`cd backend && npm run start:dev`, con su `.env` configurado) para los tests que dependen de datos reales, como `authenticated.spec.ts`.

## Estrategia de datos de prueba

Cada test es responsable de crear y limpiar sus propios datos (por ejemplo: alta de materia → asserts → eliminarla al final del test), en vez de depender de un seed fijo en la base compartida. Esto evita que los tests queden acoplados al estado de una DB que puede cambiar, y permite correrlos en paralelo sin que se pisen entre sí.

## Autenticación

El proyecto `setup` (`tests/auth.setup.ts`) hace login una sola vez contra Firebase con el usuario de prueba y guarda la sesión en `.auth/user.json` (gitignorado). El resto de los tests reutiliza esa sesión mediante `storageState`, evitando loguearse en cada test. No hay tokens ni contraseñas hardcodeadas en el código: todo sale de variables de entorno (`.env`, gitignorado).

Los tests que no necesitan sesión (como `smoke.spec.ts`, `registration.spec.ts`, `login.spec.ts` y `email-verification.spec.ts`) la ignoran explícitamente con `test.use({ storageState: { cookies: [], origins: [] } })`.

## Endpoints de test (`/test-utils/*`)

Los flujos de Registro y Questionnaire tienen pasos que normalmente requieren intervención manual (clickear el link de verificación que llega por mail) o un estado compartido que hay que poder resetear (el perfil del Questionnaire). Para que los tests sean repetibles y no dependan de intervención manual, el backend expone endpoints de test bajo `/test-utils`, habilitados solo cuando `E2E_TESTING=true`:

- `POST /test-utils/verify-email { email }`: marca el email como verificado en Firebase (equivalente a clickear el link real).
- `POST /test-utils/reset-profile { email }`: borra el `StudentProfile` del usuario, para volver a un estado "sin completar el Questionnaire".
- `POST /test-utils/delete-user { email }`: borra el usuario de prueba (Firebase + datos en la DB), usado como cleanup en `registration.spec.ts` y `email-verification.spec.ts`.

Estos endpoints devuelven 404 si `E2E_TESTING` no está en `true`, así que nunca deben quedar accesibles en producción. Los helpers de `tests/helpers/testUtils.ts` los consumen por HTTP contra `E2E_API_BASE_URL`.

Los tests de `questionnaire.spec.ts` reutilizan el mismo usuario fijo (`E2E_TEST_EMAIL`) y mutan su perfil mediante `reset-profile`, por lo que ese archivo corre en modo `serial` (`test.describe.configure({ mode: 'serial' })`) para no pisarse entre corridas paralelas.

## CI

El config detecta `process.env.CI` automáticamente (retries, workers, modo headless). Falta agregar el step de GitHub Actions cuando se decida integrar E2E al pipeline — queda fuera del alcance de este ticket.
