import { useNavigate } from 'react-router-dom';
import { IconBell } from '../../assets/icons/IconBell';
import { useNotifications } from '../../context/notificationsContext';
import { usePush } from '../../context/pushContext';
import './index.css';

// Con más no leídas que esto se muestra "9+"
const MAX_BADGE = 9;

export function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { status: pushStatus, needsRecovery, openEnableDialog } = usePush();

  // Si las notificaciones nativas se pueden activar (o terminar de activar) y
  // todavía no están, se ofrece antes de ir al listado
  const handleClick = () => {
    const goToList = () => navigate('/notifications');

    if (pushStatus === 'default' || needsRecovery) {
      openEnableDialog({ onClose: goToList });
      return;
    }
    goToList();
  };

  return (
    <button
      type="button"
      className="notification-bell"
      onClick={handleClick}
      aria-label={
        unreadCount > 0
          ? `Notificaciones, ${unreadCount} sin leer`
          : 'Notificaciones'
      }
    >
      <IconBell size={24} color="var(--color-grey-500)" />
      {unreadCount > 0 && (
        <span className="notification-bell__badge" aria-hidden="true">
          {unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}
        </span>
      )}
    </button>
  );
}
