import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { useNotifications } from '../../context/notificationsContext';
import { getNotificationPath } from '../../lib/notificationFormat';
import type { NotificationType } from '../../lib/notificationsApi';

// Mensajes que manda public/firebase-messaging-sw.js a la página
interface PushMessage {
  type?: string;
  data?: { notificationId?: string; type?: string; referenceId?: string };
}

// Parámetro con el que se abre la app al tocar un push con la app cerrada
const NOTIFICATION_PARAM = 'notification';

const NOTIFICATION_TYPES: string[] = ['TRIP', 'CHAT', 'MATCH'];

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && NOTIFICATION_TYPES.includes(value);
}

// No dibuja nada: recibe lo que llega por push y actúa
export function PushMessageHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useAuth();
  const { refresh, markAsRead } = useNotifications();

  // Con la app abierta, el service worker avisa en vez de mostrar un aviso del sistema
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent<PushMessage>) => {
      const message = event.data;

      // Llegó un push con la app a la vista: solo se actualiza lo de adentro
      if (message?.type === 'conexia-push') {
        void refresh();
        return;
      }

      // Se tocó un push con la app ya abierta: se marca como leído y se navega
      if (message?.type === 'conexia-push-click') {
        const { notificationId, type, referenceId } = message.data ?? {};

        if (notificationId) {
          markAsRead(notificationId).catch((error) =>
            console.error('Error al marcar la notificación como leída:', error),
          );
        }

        const path = isNotificationType(type)
          ? getNotificationPath({ type, referenceId: referenceId || null })
          : null;
        navigate(path ?? '/notifications');
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () =>
      navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [navigate, refresh, markAsRead]);

  // Se tocó un push con la app cerrada: se abrió con el id en la dirección
  useEffect(() => {
    if (status !== 'authed') return;

    const params = new URLSearchParams(location.search);
    const notificationId = params.get(NOTIFICATION_PARAM);
    if (!notificationId) return;

    markAsRead(notificationId).catch((error) =>
      console.error('Error al marcar la notificación como leída:', error),
    );

    params.delete(NOTIFICATION_PARAM);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    );
  }, [status, location.pathname, location.search, markAsRead, navigate]);

  return null;
}
