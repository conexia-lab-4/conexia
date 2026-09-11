import type { DayOfWeek, Subject } from './subjectsApi';

export interface ScheduleEntry {
  subjectId: string;
  subjectName: string;
  scheduleId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroom: string | null;
}

export interface DayGroup {
  day: DayOfWeek;
  entries: ScheduleEntry[];
}

const DAY_ORDER: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'LUNES',
  TUESDAY: 'MARTES',
  WEDNESDAY: 'MIÉRCOLES',
  THURSDAY: 'JUEVES',
  FRIDAY: 'VIERNES',
  SATURDAY: 'SÁBADO',
  SUNDAY: 'DOMINGO',
};

export function groupSubjectsByDay(subjects: Subject[]): DayGroup[] {
  const byDay = new Map<DayOfWeek, ScheduleEntry[]>();

  for (const subject of subjects) {
    for (const schedule of subject.schedules) {
      const entry: ScheduleEntry = {
        subjectId: subject.id,
        subjectName: subject.name,
        scheduleId: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        classroom: schedule.classroom,
      };
      const existing = byDay.get(schedule.dayOfWeek) ?? [];
      existing.push(entry);
      byDay.set(schedule.dayOfWeek, existing);
    }
  }

  return DAY_ORDER.filter((day) => byDay.has(day)).map((day) => ({
    day,
    entries: [...byDay.get(day)!].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    ),
  }));
}
