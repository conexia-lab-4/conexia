import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconBack } from '../../assets/icons/IconBack';
import ConexiaLoader from '../../components/ConexiaLoader';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { NavBar } from '../../components/navbar';
import { NotificationItem } from '../../components/notificationitem';
import { useNotifications } from '../../context/notificationsContext';
import {
  filterNotifications,
  getNotificationPath,
  groupByDay,
  type NotificationFilter,
} from '../../lib/notificationFormat';
import type { AppNotification } from '../../lib/notificationsApi';
import './index.css';

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'unread', label: 'No leídas' },
  { id: 'TRIP', label: 'Viajes' },
  { id: 'CHAT', label: 'Chats' },
  { id: 'MATCH', label: 'Matches' },
];

export function Notifications() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notifications, unreadCount, listStatus, loadList, markAsRead } =
    useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  // Al abrir la pantalla se actualiza el listado
  useEffect(() => {
    void loadList();
  }, [loadList]);

  // Si la pantalla se abrió directo (por ejemplo desde un push) no hay a dónde
  // volver: se va al Home
  const handleBack = () => {
    if (location.key === 'default') navigate('/home');
    else navigate(-1);
  };

  const handleSelect = (notification: AppNotification) => {
    if (!notification.readAt) {
      markAsRead(notification.id).catch((error) =>
        console.error('Error al marcar la notificación como leída:', error),
      );
    }

    const path = getNotificationPath(notification);
    if (path) navigate(path);
  };

  const visible = filterNotifications(notifications, filter);
  const groups = groupByDay(visible);

  const getLabel = (id: NotificationFilter, label: string) => {
    if (id === 'all') return `${label} (${notifications.length})`;
    if (id === 'unread') return `${label} (${unreadCount})`;
    return label;
  };

  return (
    <div className="notifications">
      <header className="notifications__header">
        <button
          type="button"
          className="notifications__back"
          onClick={handleBack}
          aria-label="Volver"
        >
          <IconBack size={24} color="var(--color-black)" />
        </button>
        <h1 className="text-h6">Notificaciones</h1>
      </header>

      <div className="notifications__filters" role="group" aria-label="Filtros">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`notifications__filter${filter === id ? ' notifications__filter--active' : ''}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {getLabel(id, label)}
          </button>
        ))}
      </div>

      {(listStatus === 'idle' || listStatus === 'loading') && (
        <div className="notifications__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {listStatus === 'error' && (
        <div className="notifications__status notifications__status--error">
          <p>No pudimos cargar tus notificaciones. Intentá de nuevo.</p>
          <button
            type="button"
            className="notifications__retry-button"
            onClick={() => void loadList()}
          >
            Reintentar
          </button>
        </div>
      )}

      {listStatus === 'ready' && notifications.length === 0 && (
        <EmptyTripsState
          title="Todavía no tenés notificaciones"
          subtitle="Cuando pase algo en tus viajes, matches o chats, te avisamos acá."
        />
      )}

      {listStatus === 'ready' &&
        notifications.length > 0 &&
        visible.length === 0 && (
          <p className="notifications__status">
            No hay notificaciones para este filtro.
          </p>
        )}

      {listStatus === 'ready' &&
        groups.map((group) => (
          <section key={group.label} className="notifications__group">
            <h2 className="notifications__group-title">{group.label}</h2>
            <ul className="notifications__list">
              {group.items.map((notification) => (
                <li key={notification.id}>
                  <NotificationItem
                    notification={notification}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

      <NavBar activeItem={null} />
    </div>
  );
}
