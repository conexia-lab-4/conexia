export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires';

// en-CA formatea como YYYY-MM-DD
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ARGENTINA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Día calendario en Buenos Aires como YYYY-MM-DD
export function argentinaDay(date: Date = new Date()): string {
  return formatter.format(date);
}

// Día calendario en Buenos Aires, a medianoche UTC (formato de una columna @db.Date)
export function argentinaDate(date: Date = new Date()): Date {
  return dayToDate(argentinaDay(date));
}

export function dayToDate(day: string): Date {
  if (!DAY_PATTERN.test(day) || Number.isNaN(Date.parse(day))) {
    throw new Error(`Fecha inválida: "${day}", se espera YYYY-MM-DD`);
  }
  return new Date(`${day}T00:00:00.000Z`);
}

export function addDays(day: string, days: number): string {
  const date = dayToDate(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
