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
  classroom: string | null;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  visibleProfile: boolean;
  schedules: Schedule[];
}

export async function getSubjects(): Promise<Subject[]> {
  const response = await authFetch('/subjects');

  if (!response.ok) {
    throw new Error('No se pudieron obtener las materias');
  }

  return response.json();
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const response = await authFetch(`/schedules/${scheduleId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('No se pudo eliminar el horario');
  }
}

export interface UpdateScheduleInput {
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  classroom?: string;
}

export async function updateSchedule(
  scheduleId: string,
  data: UpdateScheduleInput,
): Promise<Schedule> {
  const response = await authFetch(`/schedules/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('No se pudo actualizar el horario');
  }

  return response.json();
}
