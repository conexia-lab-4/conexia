import { test, expect } from '@playwright/test';
import { resetProfile } from './helpers/testUtils';

test.describe('Questionnaire', () => {
  // Todos los tests de este archivo comparten el mismo usuario de prueba
  // (E2E_TEST_EMAIL) y mutan su perfil, así que no pueden correr en paralelo
  // entre sí sin pisarse.
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async () => {
    const email = process.env.E2E_TEST_EMAIL;
    if (!email) {
      throw new Error('Falta E2E_TEST_EMAIL en e2e/.env.');
    }
    await resetProfile(email);
  });

  test('completar el cuestionario guarda el perfil y persiste como completo', async ({
    page,
  }) => {
    await page.goto('/questionnaire');

    // Paso 1: universidad
    await page.getByRole('button', { name: 'Universidad Austral' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 2: carrera / año / campus
    await page.getByLabel('Carrera').fill('Ingeniería en Informática');
    const campusField = page.getByLabel('Sede/Campus');
    await campusField.click(); // cierra el combobox de carrera (blur)
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Aumentar año' }).click();
    await campusField.fill('Pilar');
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Paso 3: auto
    await page.getByRole('button', { name: 'Sí, tengo auto.' }).click();
    await page.getByRole('button', { name: 'Aumentar año' }).click();
    await page.getByRole('button', { name: 'Terminar' }).click();

    await expect(
      page.getByRole('heading', { name: '¡Tu perfil ya está listo!' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Cargar mis horarios' }).click();
    await expect(page).toHaveURL(/\/schedule/);

    await page.goto('/home');
    await expect(page.locator('.profile-pending-card')).toHaveCount(0);
  });

  test('omitir el cuestionario redirige a home con el perfil pendiente', async ({
    page,
  }) => {
    await page.goto('/questionnaire');

    await page.getByRole('button', { name: 'Universidad Austral' }).click();
    await page.getByRole('button', { name: 'Completar después' }).click();

    await expect(page).toHaveURL(/\/home/);
    await expect(
      page.getByText('Tu perfil está casi listo!'),
    ).toBeVisible();
  });

  test('al volver desde "Continuar" se retoman los datos parciales guardados', async ({
    page,
  }) => {
    await page.goto('/questionnaire');
    await page.getByRole('button', { name: 'Universidad Austral' }).click();
    await page.getByRole('button', { name: 'Completar después' }).click();
    await expect(page).toHaveURL(/\/home/);

    await page
      .locator('.profile-pending-card')
      .getByRole('button', { name: 'Continuar' })
      .click();

    await expect(page).toHaveURL(/\/questionnaire/);
    await expect(
      page.getByRole('button', { name: 'Universidad Austral' }),
    ).toHaveClass(/selectable-card--selected/);
  });
});
