import { IconCar } from '../../assets/icons/IconCar';
import { IconChat } from '../../assets/icons/IconChat';
import { IconChevronRight } from '../../assets/icons/IconChevronRight';
import { IconUsersThree } from '../../assets/icons/IconUsersThree';
import { formatNotificationTime } from '../../lib/notificationFormat';
import type {
  AppNotification,
  NotificationType,
} from '../../lib/notificationsApi';
import './index.css';

interface NotificationItemProps {
  notification: AppNotification;
  onSelect: (notification: AppNotification) => void;
}

const ICONS: Record<
  NotificationType,
  { Icon: typeof IconCar; color: string; modifier: string }
> = {
  TRIP: { Icon: IconCar, color: 'var(--color-primary-500)', modifier: 'trip' },
  CHAT: {
    Icon: IconChat,
    color: 'var(--color-primary-500)',
    modifier: 'chat',
  },
  MATCH: {
    Icon: IconUsersThree,
    color: 'var(--color-success-500)',
    modifier: 'match',
  },
};

export function NotificationItem({
  notification,
  onSelect,
}: NotificationItemProps) {
  const { type, title, message, createdAt, readAt } = notification;
  const { Icon, color, modifier } = ICONS[type];
  const isUnread = !readAt;

  return (
    <button
      type="button"
      className={`notification-item${isUnread ? ' notification-item--unread' : ''}`}
      onClick={() => onSelect(notification)}
    >
      <span
        className={`notification-item__icon notification-item__icon--${modifier}`}
      >
        <Icon size={24} color={color} />
      </span>

      <span className="notification-item__body">
        <span className="notification-item__title">{title}</span>
        <span className="notification-item__message">{message}</span>
      </span>

      <span className="notification-item__side">
        <span className="notification-item__time">
          {formatNotificationTime(createdAt)}
        </span>
        {isUnread && (
          <span
            className="notification-item__dot"
            role="img"
            aria-label="Sin leer"
          />
        )}
      </span>

      <IconChevronRight size={16} color="var(--color-grey-300)" />
    </button>
  );
}
