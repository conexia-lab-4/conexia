import { authFetch } from './api';
import { getErrorMessage } from './tripsApi';

export type NotificationType = 'TRIP' | 'CHAT' | 'MATCH';

// Respuesta de GET /notifications (el backend manda algunos campos más que no se usan)
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  // Viaje (TRIP y CHAT) o match (MATCH). Puede ser null
  referenceId: string | null;
  // null mientras no se leyó
  readAt: string | null;
  createdAt: string;
}

// Todas las del usuario, de la más reciente a la más antigua
export async function getNotifications(): Promise<AppNotification[]> {
  const response = await authFetch('/notifications');

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos cargar tus notificaciones'),
    );
  }

  return response.json();
}

export async function getUnreadCount(): Promise<number> {
  const response = await authFetch('/notifications/unread-count');

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos consultar tus novedades'),
    );
  }

  const data: { count: number } = await response.json();
  return data.count;
}

// Es idempotente: marcar una que ya estaba leída no cambia nada
export async function markNotificationAsRead(
  id: string,
): Promise<AppNotification> {
  const response = await authFetch(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos marcar la notificación'),
    );
  }

  return response.json();
}

// Registra o reemplaza el token FCM del usuario, para recibir push nativas
export async function registerPushToken(token: string): Promise<void> {
  const response = await authFetch('/notifications/token', {
    method: 'PUT',
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos activar las notificaciones'),
    );
  }
}
