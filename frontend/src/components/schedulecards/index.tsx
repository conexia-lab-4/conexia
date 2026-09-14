import { IconClockOutline } from '../../assets/icons/IconClockOutline';
import { IconMapPin } from '../../assets/icons/IconMapPin';
import { IconDotsThree } from '../../assets/icons/IconDotsThree';
import { IconUsersThreeOutline } from '../../assets/icons/IconUsersThreeOutline';
import { IconPencil } from '../../assets/icons/IconPencil';
import { IconTrash } from '../../assets/icons/IconTrash';
import type { SubjectColor } from '../../lib/subjectsApi';
import './index.css';

export type ScheduleCardColorVariant = SubjectColor;

interface ScheduleCardProps {
  subject: string;
  colorVariant: ScheduleCardColorVariant;
  startTime: string;
  endTime: string;
  classroom?: string;
  matches?: number;
  isMenuOpen?: boolean;
  onToggleMenu?: () => void;
  onEdit?: () => void;
  onDeleteScheduleClick?: () => void;
  onDeleteSubjectClick?: () => void;
}

const COLOR_CONFIG: Record<
  ScheduleCardColorVariant,
  { border: string; badgeBg: string; badgeText: string }
> = {
  BLUE: {
    border: 'var(--color-subject-1)',
    badgeBg: 'var(--color-subject-1)',
    badgeText: 'var(--color-grey-500)',
  },
  PURPLE: {
    border: 'var(--color-subject-2)',
    badgeBg: 'var(--color-subject-2)',
    badgeText: 'var(--color-grey-500)',
  },
  PINK: {
    border: 'var(--color-subject-3)',
    badgeBg: 'var(--color-subject-3)',
    badgeText: 'var(--color-grey-500)',
  },
  ORANGE: {
    border: 'var(--color-subject-4)',
    badgeBg: 'var(--color-subject-4)',
    badgeText: 'var(--color-grey-500)',
  },
  YELLOW: {
    border: 'var(--color-subject-5)',
    badgeBg: 'var(--color-subject-5)',
    badgeText: 'var(--color-grey-500)',
  },
  GREEN: {
    border: 'var(--color-subject-6)',
    badgeBg: 'var(--color-subject-6)',
    badgeText: 'var(--color-grey-500)',
  },
};

export function ScheduleCard({
  subject,
  colorVariant,
  startTime,
  endTime,
  classroom,
  matches,
  isMenuOpen,
  onToggleMenu,
  onEdit,
  onDeleteScheduleClick,
  onDeleteSubjectClick,
}: ScheduleCardProps) {
  const config = COLOR_CONFIG[colorVariant];

  return (
    <div className="schedule-card" style={{ borderLeftColor: config.border }}>
      <div className="schedule-card__header">
        <span className="schedule-card__title">{subject}</span>
        <div className="schedule-card__menu-wrapper">
          <button
            type="button"
            className="schedule-card__menu-btn"
            onClick={onToggleMenu}
            aria-label={`Opciones de ${subject}`}
          >
            <IconDotsThree size={18} color="var(--color-grey-400)" />
          </button>

          {isMenuOpen && (
            <>
              <div
                className="schedule-card__menu-overlay"
                onClick={onToggleMenu}
              />
              <div className="schedule-card__menu">
                <button
                  type="button"
                  className="schedule-card__menu-item"
                  onClick={onEdit}
                >
                  <IconPencil size={16} color="var(--color-text)" />
                  Editar materia
                </button>
                <button
                  type="button"
                  className="schedule-card__menu-item schedule-card__menu-item--danger"
                  onClick={onDeleteScheduleClick}
                >
                  <IconTrash size={16} color="var(--color-error-500)" />
                  Eliminar solo este horario
                </button>
                <button
                  type="button"
                  className="schedule-card__menu-item schedule-card__menu-item--danger"
                  onClick={onDeleteSubjectClick}
                >
                  <IconTrash size={16} color="var(--color-error-500)" />
                  Eliminar materia
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <span
        className="schedule-card__time-badge"
        style={{
          backgroundColor: config.badgeBg,
          color: config.badgeText,
        }}
      >
        <IconClockOutline size={14} color={config.badgeText} />
        {startTime} - {endTime}
      </span>

      {(classroom || matches !== undefined) && (
        <div className="schedule-card__footer">
          {classroom && (
            <span className="schedule-card__footer-item">
              <IconMapPin size={14} color="var(--color-grey-400)" />
              {classroom}
            </span>
          )}
          {classroom && matches !== undefined && (
            <span className="schedule-card__footer-separator">|</span>
          )}
          {matches !== undefined && (
            <span className="schedule-card__footer-item">
              <IconUsersThreeOutline size={14} color="var(--color-grey-400)" />
              {matches} coincidencia{matches === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
