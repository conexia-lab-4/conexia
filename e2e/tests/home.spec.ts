import { test, expect } from './fixtures/authenticated';

test.describe('Home', () => {
  test('accede al Home con un usuario autenticado y verificado', async ({
    page,
  }) => {
    await page.goto('/home');

    await expect(page.getByRole('heading', { name: /¡Hola,/ })).toBeVisible();
    await expect(page.getByText('Mis Clases')).toBeVisible();
    await expect(page.getByText('Matches')).toBeVisible();
    await expect(page.getByText('Viajes Pendientes')).toBeVisible();
    await expect(page.getByText('Total viajes')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Próximos viajes' }),
    ).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
