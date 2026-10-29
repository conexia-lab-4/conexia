import { DayOfWeek, SubjectColor } from '../../generated/prisma/client';
import type { DraftSchedule, DraftSubject } from './dto/subject-draft';

export type SubjectDraftResponse = { subjects: DraftSubject[] };

const DAYS = Object.values(DayOfWeek) as string[];
const COLORS = Object.values(SubjectColor) as string[];

// El modelo a veces responde los días en español
const SPANISH_DAYS: Record<string, DayOfWeek> = {
  LUNES: DayOfWeek.MONDAY,
  MARTES: DayOfWeek.TUESDAY,
  MIERCOLES: DayOfWeek.WEDNESDAY,
  JUEVES: DayOfWeek.THURSDAY,
  VIERNES: DayOfWeek.FRIDAY,
  SABADO: DayOfWeek.SATURDAY,
  DOMINGO: DayOfWeek.SUNDAY,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toDay(value: unknown): DayOfWeek | '' {
  // Sin tildes y en mayúsculas: "Miércoles" -> "MIERCOLES"
  const day = toText(value)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (DAYS.includes(day)) return day as DayOfWeek;
  return SPANISH_DAYS[day] ?? '';
}

// Acepta 8:00, 8.00, 08:00 u 8:00hs. Devuelve HH:mm, o '' si no es una hora válida
function toTime(value: unknown): string {
  const match = /^(\d{1,2})[:.](\d{2})\s*(hs?)?$/i.exec(toText(value));
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return '';

  return `${String(hours).padStart(2, '0')}:${match[2]}`;
}

function toColor(value: unknown): SubjectColor | '' {
  const color = toText(value).toUpperCase();
  return COLORS.includes(color) ? (color as SubjectColor) : '';
}

function toSchedule(value: unknown): DraftSchedule | null {
  if (!isRecord(value)) return null;

  // Un horario leído a medias se conserva: solo se descarta si no trae nada
  const hasAnyData = ['dayOfWeek', 'startTime', 'endTime', 'classroom'].some(
    (field) => toText(value[field]) !== '',
  );
  if (!hasAnyData) return null;

  return {
    dayOfWeek: toDay(value.dayOfWeek),
    startTime: toTime(value.startTime),
    endTime: toTime(value.endTime),
    classroom: toText(value.classroom),
  };
}

function toSubject(value: unknown): DraftSubject | null {
  if (!isRecord(value)) return null;

  const schedules = Array.isArray(value.schedules)
    ? value.schedules
        .map(toSchedule)
        .filter((schedule): schedule is DraftSchedule => schedule !== null)
    : [];

  const subject: DraftSubject = {
    name: toText(value.name),
    career: toText(value.career),
    campus: toText(value.campus),
    color: toColor(value.color),
    schedules,
  };

  // Se descarta solo una materia sin ningún dato
  const isEmpty =
    !subject.name && !subject.career && !subject.campus && !schedules.length;
  return isEmpty ? null : subject;
}

// Convierte la respuesta del modelo en un borrador siempre válido: lo que no
// se pudo leer queda como '' y nunca lanza errores
export function normalizeSubjectDraft(raw: unknown): SubjectDraftResponse {
  if (!isRecord(raw) || !Array.isArray(raw.subjects)) {
    return { subjects: [] };
  }

  return {
    subjects: raw.subjects
      .map(toSubject)
      .filter((subject): subject is DraftSubject => subject !== null),
  };
}
