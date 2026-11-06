import type { ChatPerson } from './chatApi';
import {
  formatDayNumber,
  formatTime,
  formatWeekdayShort,
  getPersonName,
} from './tripFormat';

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

// Se redondea porque un día con cambio de hora no dura exactamente 24 horas
function daysAgo(date: Date): number {
  return Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_MS);
}

export function formatChatTime(date: Date): string {
  return formatTime(date.toISOString());
}

// "Mar 12 de ago"
export function formatChatDate(date: Date): string {
  const iso = date.toISOString();
  const month = date
    .toLocaleDateString('es-AR', { month: 'short' })
    .replace('.', '');
  return `${formatWeekdayShort(iso)} ${date.getDate()} de ${month}`;
}

export function formatDaySeparator(date: Date): string {
  const days = daysAgo(date);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return formatChatDate(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a) === startOfDay(b);
}

// Hora de hoy, "Ayer", día de esta semana o fecha corta
export function formatConversationTime(date: Date): string {
  const iso = date.toISOString();
  const days = daysAgo(date);
  if (days === 0) return formatChatTime(date);
  if (days === 1) return 'Ayer';
  if (days < 7) return formatWeekdayShort(iso);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${formatDayNumber(iso)}/${month}`;
}

export interface ConversationHeading {
  title: string;
  // Sin persona es un chat de viaje: el conductor con varios pasajeros, o
  // todavía sin ninguno
  person: ChatPerson | null;
}

// Un pasajero ve al conductor; el conductor ve a su único pasajero o el viaje
export function getConversationHeading(
  people: ChatPerson[],
  userId: string,
  destination: string,
): ConversationHeading {
  const driver = people.find((person) => person.role === 'DRIVER');
  const passengers = people.filter((person) => person.role === 'PASSENGER');
  const person =
    driver && driver.id !== userId
      ? driver
      : passengers.length === 1
        ? passengers[0]
        : null;

  return person
    ? { title: getPersonName(person.displayName), person }
    : { title: `Viaje a ${destination}`, person: null };
}

export function formatPassengerCount(count: number): string {
  if (count === 0) return 'Todavía sin pasajeros';
  return `${count} ${count === 1 ? 'pasajero' : 'pasajeros'}`;
}

// "Vos: …" o, si hay más de dos personas, el nombre de quien escribió
export function formatLastMessage(
  lastMessage: { text: string; authorId: string } | null,
  people: ChatPerson[],
  userId: string,
): string {
  if (!lastMessage) return 'Todavía no hay mensajes';
  if (lastMessage.authorId === userId) return `Vos: ${lastMessage.text}`;
  if (people.length <= 2) return lastMessage.text;

  const author = people.find((person) => person.id === lastMessage.authorId);
  const [firstName] = getPersonName(author?.displayName).split(/\s+/);
  return `${firstName}: ${lastMessage.text}`;
}
