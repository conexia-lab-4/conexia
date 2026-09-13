import { authFetch } from './api';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface Schedule {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface Subject {
  id: string;
  name: string;
  schedules: Schedule[];
}

export async function getSubjects(): Promise<Subject[]> {
  const response = await authFetch('/subjects');

  if (!response.ok) {
    throw new Error('No se pudieron obtener las materias');
  }

  return response.json();
}

export type SubjectColor =
  'BLUE' | 'PURPLE' | 'PINK' | 'ORANGE' | 'YELLOW' | 'GREEN';

export interface CreateScheduleInput {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  classroom?: string;
}

export interface CreateSubjectInput {
  name: string;
  color: SubjectColor;
  schedules: CreateScheduleInput[];
}

export async function createSubject(
  payload: CreateSubjectInput,
): Promise<Subject> {
  const response = await authFetch('/subjects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('No se pudo crear la materia');
  }

  return response.json();
}
