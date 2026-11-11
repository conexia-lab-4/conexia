import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  type AppNotification,
} from '../lib/notificationsApi';
import { useAuth } from './authContext';
import {
  NotificationsContext,
  type ListStatus,
  type NotificationsContextValue,
} from './notificationsContext';

// Cada cuánto se consultan las novedades con la app visible
const POLL_INTERVAL_MS = 30_000;

const countUnread = (list: AppNotification[]) =>
  list.filter((notification) => !notification.readAt).length;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const uid = user?.uid ?? null;
  const enabled = status === 'authed';

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [listStatus, setListStatus] = useState<ListStatus>('idle');
  const [ownerUid, setOwnerUid] = useState(uid);

  // Si cambia el usuario (cierre de sesión o ingreso de otra cuenta) no se
  // conserva nada de la sesión anterior
  if (ownerUid !== uid) {
    setOwnerUid(uid);
    setNotifications([]);
    setUnreadCount(0);
    setListStatus('idle');
  }

  // Las consultas leen el último valor sin volver a crearse en cada cambio
  const uidRef = useRef(uid);
  const listStatusRef = useRef(listStatus);
  useEffect(() => {
    uidRef.current = uid;
    listStatusRef.current = listStatus;
  }, [uid, listStatus]);

  const refresh = useCallback(async () => {
    const startedFor = uidRef.current;

    try {
      if (listStatusRef.current === 'ready') {
        // Con el listado cargado, una sola consulta actualiza todo
        const list = await getNotifications();
        if (uidRef.current !== startedFor) return;
        setNotifications(list);
        setUnreadCount(countUnread(list));
      } else {
        const count = await getUnreadCount();
        if (uidRef.current !== startedFor) return;
        setUnreadCount(count);
      }
    } catch (error) {
      // Una consulta periódica que falla no molesta: se reintenta en la próxima
      console.error('Error al consultar las notificaciones:', error);
    }
  }, []);

  const loadList = useCallback(async () => {
    const startedFor = uidRef.current;

    // La primera vez, o después de un error, se muestra la carga. Si ya hay
    // listado se actualiza sin taparlo
    if (listStatusRef.current !== 'ready') setListStatus('loading');

    try {
      const list = await getNotifications();
      if (uidRef.current !== startedFor) return;
      setNotifications(list);
      setUnreadCount(countUnread(list));
      setListStatus('ready');
    } catch (error) {
      console.error('Error al cargar las notificaciones:', error);
      if (uidRef.current !== startedFor) return;
      setListStatus((current) => (current === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  const markAsRead = useCallback(
    async (id: string) => {
      const updated = await markNotificationAsRead(id);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, readAt: updated.readAt }
            : notification,
        ),
      );
      // El contador sale del backend para que coincida con el listado
      await refresh();
    },
    [refresh],
  );

  // Con la app visible se consulta cada 30 segundos, al volver a la app y al
  // enfocar la ventana. Con la app oculta no se consulta nada
  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      void refresh();
      timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    const handleFocus = () => void refresh();

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refresh]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      listStatus,
      refresh,
      loadList,
      markAsRead,
    }),
    [notifications, unreadCount, listStatus, refresh, loadList, markAsRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
