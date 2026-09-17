import { test, expect } from './fixtures/authenticated';
import {
  addSubjectViaUI,
  deleteSubjectByNameViaUI,
  uniqueSubjectName,
} from './helpers/schedule';

test.describe('Alta de materia', () => {
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
