import { useLayoutEffect, useRef, useState } from 'react';
import { IconCheck } from '../../assets/icons/IconCheck';
import './index.css';

type TripStatus = 'pendiente' | 'rechazado' | 'confirmado';

interface TripCardProps {
  initials: string;
  title: string;
  subtitle: string;
  status: TripStatus;
}

const STATUS_CONFIG: Record<
  TripStatus,
  { bg: string; text: string; label: string }
> = {
  pendiente: {
    bg: 'var(--color-badge-yellow-bg)',
    text: 'var(--color-badge-yellow-text)',
    label: 'Pendiente',
  },
  rechazado: {
    bg: 'var(--color-error-100)',
    text: 'var(--color-badge-red-text)',
    label: 'Rechazado',
  },
  confirmado: {
    bg: 'var(--color-badge-mint-bg)',
    text: 'var(--color-badge-mint-text)',
    label: 'Confirmado',
  },
};

export function TripCard({ initials, title, subtitle, status }: TripCardProps) {
  const config = STATUS_CONFIG[status];
  const infoRef = useRef<HTMLDivElement>(null);
  const [avatarSize, setAvatarSize] = useState(47);

  useLayoutEffect(() => {
    const el = infoRef.current;
    if (!el) return;

    const updateSize = () => setAvatarSize(el.offsetHeight);
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="trip-card">
      <div
        className="trip-card__avatar"
        style={{ width: avatarSize, height: avatarSize }}
      >
        {initials}
      </div>
      <div className="trip-card__info" ref={infoRef}>
        <span className="trip-card__title">{title}</span>
        <span className="trip-card__subtitle">{subtitle}</span>
      </div>
      <div className="trip-card__badge-wrapper">
        <span
          className="trip-card__badge"
          style={{ backgroundColor: config.bg, color: config.text }}
        >
          {status === 'confirmado' && (
            <IconCheck size={15} color="var(--color-success-500)" />
          )}
          {config.label}
        </span>
      </div>
    </div>
  );
}
