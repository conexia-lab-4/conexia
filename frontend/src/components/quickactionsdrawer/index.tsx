import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCar } from '../../assets/icons/IconCar';
import { IconChevronRight } from '../../assets/icons/IconChevronRight';
import { IconClose } from '../../assets/icons/IconClose';
import { IconUsers } from '../../assets/icons/IconUsers';
import './index.css';

interface QuickActionsDrawerProps {
  hasCar: boolean;
  onClose: () => void;
}

export function QuickActionsDrawer({
  hasCar,
  onClose,
}: QuickActionsDrawerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="quick-actions-drawer__overlay" onClick={onClose}>
      <div
        className="quick-actions-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-actions-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="quick-actions-drawer__close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <IconClose size={12} color="var(--color-grey-400)" />
        </button>
        <span className="quick-actions-drawer__handle" />
        <h2
          id="quick-actions-drawer-title"
          className="quick-actions-drawer__title"
        >
          ¿Qué querés hacer?
        </h2>

        {hasCar && (
          <button
            type="button"
            className="quick-actions-drawer__option"
            onClick={() => navigate('/trips/new')}
          >
            <IconCar size={28} color="var(--color-primary-500)" />
            <span className="quick-actions-drawer__texts">
              <span className="quick-actions-drawer__option-title">
                Ofrecer auto
              </span>
              <span className="quick-actions-drawer__option-description">
                Publicar un viaje y ofrecer asientos disponibles
              </span>
            </span>
            <IconChevronRight size={16} color="var(--color-primary-500)" />
          </button>
        )}

        <button
          type="button"
          className="quick-actions-drawer__option"
          onClick={() => navigate('/trips/intents/new')}
        >
          <IconUsers size={28} color="var(--color-primary-500)" />
          <span className="quick-actions-drawer__texts">
            <span className="quick-actions-drawer__option-title">
              Buscar auto
            </span>
            <span className="quick-actions-drawer__option-description">
              Publicar una intención de viaje para encontrar un conductor
            </span>
          </span>
          <IconChevronRight size={16} color="var(--color-primary-500)" />
        </button>
      </div>
    </div>
  );
}
