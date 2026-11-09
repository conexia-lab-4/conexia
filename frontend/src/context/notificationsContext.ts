import { createContext, useContext } from 'react';
import type { AppNotification } from '../lib/notificationsApi';

export type ListStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  listStatus: ListStatus;
  // Consulta las novedades. La usan la consulta periódica y, más adelante,
  // los push recibidos con la app visible
  refresh: () => Promise<void>;
  // Carga el listado al abrir la pantalla de notificaciones
  loadList: () => Promise<void>;
  // Marca como leída y actualiza el listado y el contador con el backend
  markAsRead: (id: string) => Promise<void>;
}

export const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      'useNotifications debe usarse dentro de <NotificationsProvider>',
    );
  }
  return ctx;
}
