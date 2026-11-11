import type { AppNotification, NotificationType } from './notificationsApi';

// A qué pantalla lleva cada tipo. Sin referencia no hay a dónde ir
export function getNotificationPath(
  notification: Pick<AppNotification, 'type' | 'referenceId'>,
): string | null {
  const { type, referenceId } = notification;
  if (!referenceId) return null;

  const id = encodeURIComponent(referenceId);
  switch (type) {
    case 'TRIP':
      return `/trips/${id}`;
    case 'CHAT':
      return `/chats/${id}`;
    case 'MATCH':
      return `/matches/${id}`;
  }
}

export type NotificationFilter = 'all' | 'unread' | NotificationType;

export function filterNotifications(
  notifications: AppNotification[],
  filter: NotificationFilter,
): AppNotification[] {
  if (filter === 'all') return notifications;
  if (filter === 'unread') {
    return notifications.filter((notification) => !notification.readAt);
  }
  return notifications.filter((notification) => notification.type === filter);
}

export interface NotificationGroup {
  label: string;
  items: AppNotification[];
}

const dayKey = (date: Date) => date.toDateString();

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
});

function getDayLabel(date: Date, now: Date): string {
  if (dayKey(date) === dayKey(now)) return 'Hoy';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(yesterday)) return 'Ayer';

  return dateFormatter.format(date);
}

// Las notificaciones llegan de la más reciente a la más antigua, así que las
// del mismo día quedan juntas
export function groupByDay(
  notifications: AppNotification[],
  now: Date = new Date(),
): NotificationGroup[] {
  const groups: NotificationGroup[] = [];

  for (const notification of notifications) {
    const label = getDayLabel(new Date(notification.createdAt), now);
    const last = groups[groups.length - 1];

    if (last && last.label === label) {
      last.items.push(notification);
    } else {
      groups.push({ label, items: [notification] });
    }
  }

  return groups;
}

const timeFormatter = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatNotificationTime(createdAt: string): string {
  return timeFormatter.format(new Date(createdAt));
}
