import type { DayOfWeek, SubjectColor } from '../../../generated/prisma/client';

// Borrador de materias leído de una imagen: todo campo puede venir vacío ('')
// para que el usuario lo complete antes de guardar
export type DraftSchedule = {
  dayOfWeek: DayOfWeek | '';
  // HH:mm o ''
  startTime: string;
  endTime: string;
  classroom: string;
};

export type DraftSubject = {
  name: string;
  career: string;
  campus: string;
  color: SubjectColor | '';
  schedules: DraftSchedule[];
};
