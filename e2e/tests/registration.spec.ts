import { test, expect } from '@playwright/test';
import { deleteTestUser } from './helpers/testUtils';
import { VALID_TEST_PASSWORD, uniqueTestEmail } from './helpers/fixtures';

test.describe('Registro', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('registro exitoso redirige a la verificación de email', async ({
    page,
  }) => {
    const email = uniqueTestEmail('e2e-registro');

    try {
      await page.goto('/register');
      await page.getByLabel('Nombre').fill('Juana');
      await page.getByLabel('Apellido').fill('Pérez');
      await page.getByLabel('Email institucional').fill(email);
      await page.getByLabel('Contraseña').fill(VALID_TEST_PASSWORD);
      await page.getByRole('button', { name: 'Registrarse' }).click();

      await expect(page).toHaveURL(/\/verify-email/);
      await expect(
        page.getByRole('heading', { name: 'Verifique su email!' }),
      ).toBeVisible();
    } finally {
      await deleteTestUser(email);
    }
  });

  test('muestra error si falta el nombre', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByLabel('Email institucional').fill('valido@mail.com');
    await page.getByLabel('Contraseña').fill(VALID_TEST_PASSWORD);
    await page.getByRole('button', { name: 'Registrarse' }).click();

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('muestra error si el email tiene formato inválido', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByLabel('Nombre').fill('Juana');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByLabel('Email institucional').fill('esto-no-es-un-email');
    await page.getByLabel('Contraseña').fill(VALID_TEST_PASSWORD);
    await page.getByRole('button', { name: 'Registrarse' }).click();

    await expect(page.getByText('Ingresá un email válido')).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });

  test('muestra error si la contraseña no cumple los requisitos', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.getByLabel('Nombre').fill('Juana');
    await page.getByLabel('Apellido').fill('Pérez');
    await page.getByLabel('Email institucional').fill('valido@mail.com');
    await page.getByLabel('Contraseña').fill('abc');
    await page.getByRole('button', { name: 'Registrarse' }).click();

    await expect(
      page.getByText(
        'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un carácter especial',
      ),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/register/);
  });
});
