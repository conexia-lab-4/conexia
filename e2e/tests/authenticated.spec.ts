import { test, expect } from './fixtures/authenticated';

test('accede a Mis Horarios estando logueado', async ({ page }) => {
  await page.goto('/schedule');
  await expect(
    page.getByRole('heading', { name: 'Mis Horarios' }),
  ).toBeVisible();
});
