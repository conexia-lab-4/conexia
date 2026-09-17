import { test, expect, type Page } from '@playwright/test';
import { deleteTestUser, verifyEmail } from './helpers/testUtils';
import { VALID_TEST_PASSWORD, uniqueTestEmail } from './helpers/fixtures';

async function registerNewUser(page: Page, email: string) {
  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Juana');
  await page.getByLabel('Apellido').fill('Pérez');
  await page.getByLabel('Email institucional').fill(email);
  await page.getByLabel('Contraseña').fill(VALID_TEST_PASSWORD);
  await page.getByRole('button', { name: 'Registrarse' }).click();
  await expect(page).toHaveURL(/\/verify-email/);
}

test.describe('Verificación de email', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  let email: string;

  test.beforeEach(async ({ page }) => {
    email = uniqueTestEmail('e2e-verify');
    await registerNewUser(page, email);
  });

  test.afterEach(async () => {
    await deleteTestUser(email);
  });

  test('si todavía no verificó, muestra feedback y no avanza', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Ya validé mi email' }).click();

    await expect(
      page.getByText(
        'Todavía no verificamos tu email. Revisá tu bandeja de entrada e intentá de nuevo.',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/verify-email/);
  });

  test('reenviar email muestra confirmación', async ({ page }) => {
    await page.getByRole('button', { name: 'Reenviar email' }).click();

    await expect(
      page.getByText(
        'Te reenviamos el email de verificación. Revisá tu bandeja de entrada.',
      ),
    ).toBeVisible();
  });

  test('tras verificar el email, avanza al questionnaire', async ({
    page,
  }) => {
    await verifyEmail(email);

    await page.getByRole('button', { name: 'Ya validé mi email' }).click();

    await expect(page).toHaveURL(/\/questionnaire/);
  });
});
