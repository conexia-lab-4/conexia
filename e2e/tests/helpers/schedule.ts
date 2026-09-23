import type { Page } from '@playwright/test';

export type DayValue = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export const DAY_SHORT_LABELS: Record<DayValue, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
};

export const DAY_FULL_LABELS: Record<DayValue, string> = {
  MONDAY: 'LUNES',
  TUESDAY: 'MARTES',
  WEDNESDAY: 'MIÉRCOLES',
  THURSDAY: 'JUEVES',
  FRIDAY: 'VIERNES',
};

export type SubjectColor =
  | 'BLUE'
  | 'PURPLE'
  | 'PINK'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'RED'
  | 'CREAM';

export function uniqueSubjectName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/**
 * El selector de hora es un wheel picker (@ncdai/react-wheel-picker) con
 * scroll infinito: Home/End están deshabilitados en ese modo, así que la
 * única forma determinista de llegar a un valor es conocer el valor actual
 * y presionar ArrowUp/ArrowDown la cantidad exacta de pasos.
 */
export async function setTimeField(
  page: Page,
  triggerLabel: string,
  from: string,
  to: string,
): Promise<void> {
  const fromParsed = parseTime(from);
  const toParsed = parseTime(to);

  await page.getByRole('button', { name: triggerLabel }).click();

  const wheels = page.locator('[data-rwp]');
  const hourWheel = wheels.nth(0);
  const minuteWheel = wheels.nth(1);

  // Cada paso anima ~450ms; si se dispara el siguiente ArrowUp/ArrowDown
  // antes de que la animación previa asiente, el wheel-picker lo ignora
  // (queda "debajo" de la animación en curso), así que hay que esperar
  // paso a paso en vez de disparar todos los presses seguidos.
  const hourDelta = toParsed.hour - fromParsed.hour;
  for (let i = 0; i < Math.abs(hourDelta); i++) {
    await hourWheel.press(hourDelta > 0 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(500);
  }

  const minuteDelta = toParsed.minute - fromParsed.minute;
  for (let i = 0; i < Math.abs(minuteDelta); i++) {
    await minuteWheel.press(minuteDelta > 0 ? 'ArrowDown' : 'ArrowUp');
    await page.waitForTimeout(500);
  }

  await page.getByRole('button', { name: 'Listo' }).click();
}

export interface AddSubjectOptions {
  name: string;
  day: DayValue;
  startTime: string;
  endTime: string;
  classroom?: string;
  color: SubjectColor;
}

// El TimeField arranca en 08:00 cuando el valor todavía está vacío.
const TIME_FIELD_DEFAULT = '08:00';

export async function addSubjectViaUI(
  page: Page,
  options: AddSubjectOptions,
): Promise<void> {
  await page.goto('/assignments/new');

  await page.getByLabel('Nombre de la materia').fill(options.name);
  await page.getByRole('button', { name: DAY_SHORT_LABELS[options.day] }).click();

  await setTimeField(
    page,
    `Hora de inicio ${DAY_SHORT_LABELS[options.day]}`,
    TIME_FIELD_DEFAULT,
    options.startTime,
  );
  await setTimeField(
    page,
    `Hora de fin ${DAY_SHORT_LABELS[options.day]}`,
    TIME_FIELD_DEFAULT,
    options.endTime,
  );

  if (options.classroom) {
    await page.getByLabel('Aula').fill(options.classroom);
  }

  await page.getByRole('radio', { name: `Color ${options.color}` }).click();
  await page.getByRole('button', { name: 'Agregar materia' }).click();
}

/**
 * Borra por UI todas las materias con este nombre (el backend agrupa por
 * nombre desde KAN-128), como cleanup para que los tests sean repetibles.
 * Un solo click en "Eliminar materia" alcanza para borrar todas las
 * instancias con ese nombre.
 */
export async function deleteSubjectByNameViaUI(
  page: Page,
  subjectName: string,
): Promise<void> {
  await page.goto('/schedule');

  const menuButton = page
    .getByRole('button', { name: `Opciones de ${subjectName}` })
    .first();

  if (!(await menuButton.isVisible().catch(() => false))) {
    return;
  }

  await menuButton.click();
  await page.getByRole('button', { name: 'Eliminar materia' }).click();
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await page
    .getByRole('button', { name: `Opciones de ${subjectName}` })
    .first()
    .waitFor({ state: 'hidden' })
    .catch(() => {});
}
