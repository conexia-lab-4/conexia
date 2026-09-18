import { test, expect } from './fixtures/authenticated';
import {
  addSubjectViaUI,
  deleteSubjectByNameViaUI,
  uniqueSubjectName,
} from './helpers/schedule';

test.describe('Alta de materia', () => {
  // El alta interactúa con el wheel-picker de horarios (varias esperas
  // deliberadas de ~600ms por campo) y en CI corre en un runner más lento
  // que el entorno local, así que el timeout default de 30s queda justo.
  test.describe.configure({ timeout: 60_000 });

  test('crear una materia con un horario la deja visible en Mis Horarios', async ({
    page,
  }) => {
    const name = uniqueSubjectName('E2E Materia');

    try {
      await addSubjectViaUI(page, {
        name,
        day: 'MONDAY',
        startTime: '14:00',
        endTime: '16:00',
        classroom: '302',
        color: 'BLUE',
      });

      await expect(page).toHaveURL(/\/schedule/);

      const card = page.locator('.schedule-card', { hasText: name });
      await expect(card).toBeVisible();
      await expect(card.getByText('14:00 - 16:00')).toBeVisible();
      await expect(card.getByText('302')).toBeVisible();
    } finally {
      await deleteSubjectByNameViaUI(page, name);
    }
  });
});
