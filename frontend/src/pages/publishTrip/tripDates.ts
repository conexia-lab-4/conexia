import type { DayOfWeek, Subject } from '../../lib/subjectsApi';

const DAY_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const DAY_SHORT_LABEL: Record<DayOfWeek, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

// Minutos que se sugieren entre la salida y el inicio de la clase
const SUGGESTED_TRAVEL_MINUTES = 30;

export const DATE_OPTIONS_COUNT = 14;

export interface ScheduleOption {
  id: string;
  subjectName: string;
  classroom: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  label: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateValue(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLabel(value: string): string {
  const text = fromDateValue(value).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1).replace(',', '');
}

export function getDateOptions(): string[] {
  const today = new Date();
  return Array.from({ length: DATE_OPTIONS_COUNT }, (_, i) =>
    toDateValue(
      new Date(today.getFullYear(), today.getMonth(), today.getDate() + i),
    ),
  );
}

// Combina fecha ("YYYY-MM-DD") y hora ("HH:MM") en hora local
export function toLocalDate(date: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = fromDateValue(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m - minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function suggestDepartureTime(classStart: string): string {
  return subtractMinutes(classStart, SUGGESTED_TRAVEL_MINUTES);
}

// Próxima fecha en la que cae ese día de cursada, contando hoy si la clase
// todavía no empezó
export function nextOccurrence(
  dayOfWeek: DayOfWeek,
  startTime: string,
  now = new Date(),
): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let offset = (DAY_INDEX[dayOfWeek] - today.getDay() + 7) % 7;
  if (offset === 0 && toLocalDate(toDateValue(today), startTime) <= now) {
    offset = 7;
  }
  today.setDate(today.getDate() + offset);
  return toDateValue(today);
}

export function getScheduleOptions(
  subjects: Subject[],
  now = new Date(),
): ScheduleOption[] {
  return subjects
    .flatMap((subject) =>
      subject.schedules.map((schedule) => ({
        id: schedule.id,
        subjectName: subject.name,
        classroom: schedule.classroom,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        label: `${DAY_SHORT_LABEL[schedule.dayOfWeek]} ${schedule.startTime} · ${subject.name}`,
      })),
    )
    .sort(
      (a, b) =>
        toLocalDate(
          nextOccurrence(a.dayOfWeek, a.startTime, now),
          a.startTime,
        ).getTime() -
        toLocalDate(
          nextOccurrence(b.dayOfWeek, b.startTime, now),
          b.startTime,
        ).getTime(),
    );
}
