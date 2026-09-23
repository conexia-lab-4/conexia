import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = '.auth/user.json';
const sessionStorageFile = path.resolve(
  __dirname,
  '../.auth/session-storage.json',
);

setup('autenticarse', async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan E2E_TEST_EMAIL / E2E_TEST_PASSWORD. Copiá e2e/.env.example a e2e/.env y completá las credenciales del usuario de prueba.',
    );
  }

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  await expect(page).toHaveURL(/\/home/);
  await page.context().storageState({ path: authFile });

  // Firebase persiste la sesión en sessionStorage (browserSessionPersistence),
  // que playwright.storageState() no captura (solo cookies/localStorage/IndexedDB).
  // La guardamos aparte para inyectarla a mano en los tests que reutilizan
  // esta sesión (ver tests/fixtures/authenticated.ts).
  const sessionStorageData = await page.evaluate(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key !== null) {
        data[key] = window.sessionStorage.getItem(key) ?? '';
      }
    }
    return data;
  });

  fs.mkdirSync(path.dirname(sessionStorageFile), { recursive: true });
  fs.writeFileSync(
    sessionStorageFile,
    JSON.stringify({
      origin: new URL(page.url()).origin,
      sessionStorage: sessionStorageData,
    }),
  );
});
