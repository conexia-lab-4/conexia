import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('la app carga y muestra el landing', async ({ page }) => {
    await page.goto('/landing');
    await expect(
      page.getByRole('heading', { name: 'Bienvenido' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar Sesión' })).toBeVisible();
  });
});