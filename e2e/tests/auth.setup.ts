import { test as setup, expect } from '@playwright/test';

const authFile = '.auth/user.json';

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
});