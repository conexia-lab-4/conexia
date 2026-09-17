import { test, expect } from './fixtures/authenticated';
import {
  addSubjectViaUI,
  deleteSubjectByNameViaUI,
  setTimeField,
  uniqueSubjectName,
} from './helpers/schedule';

test.describe('Edición y eliminación de horarios', () => {
  let subjectName: string;

  test.beforeEach(async ({ page }) => {
    subjectName = uniqueSubjectName('E2E Gestion');
    await addSubjectViaUI(page, {
      name: subjectName,
      day: 'TUESDAY',
      startTime: '10:00',
      endTime: '12:00',
      classroom: '101',
      color: 'GREEN',
    });
  });

  test.afterEach(async ({ page }) => {
    await deleteSubjectByNameViaUI(page, subjectName);
  });

  test('editar un horario existente actualiza la card', async ({ page }) => {
    const card = page.locator('.schedule-card', { hasText: subjectName });
    await card
      .getByRole('button', { name: `Opciones de ${subjectName}` })
      .click();
    await card.getByRole('button', { name: 'Editar materia' }).click();

    await page.getByRole('button', { name: 'Mié' }).click();
    await setTimeField(page, 'Hora de inicio', '10:00', '15:00');
    await setTimeField(page, 'Hora de fin', '12:00', '17:00');
    await page.getByLabel('Aula').fill('205');
    await page.getByRole('button', { name: 'Guardar' }).click();

    const updatedCard = page.locator('.schedule-card', {
      hasText: subjectName,
    });
    await expect(updatedCard.getByText('15:00 - 17:00')).toBeVisible();
    await expect(updatedCard.getByText('205')).toBeVisible();
  });

  test('eliminar solo el horario lo saca de la lista sin tocar la materia', async ({
    page,
  }) => {
    const card = page.locator('.schedule-card', { hasText: subjectName });
    await card
      .getByRole('button', { name: `Opciones de ${subjectName}` })
      .click();
    await card
      .getByRole('button', { name: 'Eliminar solo este horario' })
      .click();

    await expect(
      page.getByRole('heading', { name: '¿Eliminar solo este horario?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar' }).click();

    await expect(
      page.locator('.schedule-card', { hasText: subjectName }),
    ).toHaveCount(0);
  });

  test('eliminar la materia completa con confirmación la saca de la lista', async ({
    page,
  }) => {
    const card = page.locator('.schedule-card', { hasText: subjectName });
    await card
      .getByRole('button', { name: `Opciones de ${subjectName}` })
      .click();
    await card.getByRole('button', { name: 'Eliminar materia' }).click();

    await expect(
      page.getByRole('heading', { name: '¿Eliminar materia?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar' }).click();

    await expect(
      page.locator('.schedule-card', { hasText: subjectName }),
    ).toHaveCount(0);
  });
});
