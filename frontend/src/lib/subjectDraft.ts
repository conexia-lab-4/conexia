import { SUBJECT_COLORS } from '../components/colorpicker/constants';
import type {
  DayOfWeek,
  DraftSchedule,
  DraftSubject,
  SubjectColor,
} from './subjectsApi';

// Un horario del borrador. Los bloques con el mismo subjectKey son la misma
// materia y comparten color
export interface DraftBlock {
  id: string;
  subjectKey: number;
  name: string;
  color: SubjectColor;
  dayOfWeek: DayOfWeek | '';
  startTime: string;
  endTime: string;
  classroom: string;
}

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// Mismos requisitos que el alta: nombre, día y un rango de horas válido
export function isBlockComplete(block: DraftBlock): boolean {
  return (
    block.name.trim() !== '' &&
    block.dayOfWeek !== '' &&
    TIME_REGEX.test(block.startTime) &&
    TIME_REGEX.test(block.endTime) &&
    block.endTime > block.startTime
  );
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Cada materia recibe un color distinto; si la imagen trae uno se respeta.
// Con más de 8 materias los colores se repiten, igual que en la carga manual
function assignColors(drafts: DraftSubject[]): SubjectColor[] {
  const allColors = SUBJECT_COLORS.map((color) => color.id);
  const fromImage = new Set(
    drafts.flatMap((subject) => (subject.color ? [subject.color] : [])),
  );
  const free = shuffle(allColors.filter((color) => !fromImage.has(color)));
  const pool = free.length > 0 ? free : allColors;

  let next = 0;
  return drafts.map((subject) => {
    if (subject.color) return subject.color;
    return pool[next++ % pool.length];
  });
}

const EMPTY_SCHEDULE: DraftSchedule = {
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  classroom: '',
};

export function buildDraftBlocks(drafts: DraftSubject[]): DraftBlock[] {
  const colors = assignColors(drafts);

  return drafts.flatMap((subject, subjectKey) => {
    const schedules =
      subject.schedules.length > 0 ? subject.schedules : [EMPTY_SCHEDULE];

    return schedules.map((schedule, index) => ({
      ...schedule,
      id: `${subjectKey}-${index}`,
      subjectKey,
      name: subject.name,
      color: colors[subjectKey],
    }));
  });
}
