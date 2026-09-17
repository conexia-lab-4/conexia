import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('un usuario válido y verificado accede a la app', async ({ page }) => {
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
  });

  test('credenciales inválidas muestran un error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('usuario-inexistente@mail.com');
    await page.getByLabel('Contraseña').fill('ContraseñaIncorrecta1!');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.locator('.login__error')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
