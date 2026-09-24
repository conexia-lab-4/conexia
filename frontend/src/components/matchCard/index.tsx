import type { Match } from '../../lib/matchesApi';
import { CompatibilityRing } from '../compatibilityRing';
import { IconMapPin } from '../../assets/icons/IconMapPin';
import { IconCar } from '../../assets/icons/IconCar';
import { IconClockOutline } from '../../assets/icons/IconClockOutline';
import { IconSeat } from '../../assets/icons/IconSeat';
import { IconChevronRight } from '../../assets/icons/IconChevronRight';
import './index.css';

const YEAR_LABELS: Record<number, string> = {
  1: '1er año',
  2: '2do año',
  3: '3er año',
  4: '4to año',
  5: '5to año',
  6: '6to año',
};

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
}

export function MatchCard({ match, onClick }: MatchCardProps) {
  const yearLabel = YEAR_LABELS[match.year] ?? `${match.year}° año`;

  return (
    <button type="button" className="match-card" onClick={onClick}>
      <div className="match-card__avatar-wrapper">
        <img src={match.photoUrl} alt="" className="match-card__avatar" />
        {match.isOnline && <span className="match-card__status-dot" />}
      </div>

      <div className="match-card__info">
        <span className="match-card__name text-body-2-bold">{match.name}</span>
        <span className="match-card__subtitle text-body-3">
          {match.career} {yearLabel}
        </span>
        <span className="match-card__location text-body-3">
          <IconMapPin size={12} color="var(--color-grey-400)" />
          {match.campus}
        </span>

        <div className="match-card__badges">
          {match.hasCar ? (
            <span className="match-card__badge match-card__badge--positive">
              <IconCar size={12} color="var(--color-success-700)" />
              Con auto
            </span>
          ) : (
            <span className="match-card__badge match-card__badge--negative">
              <IconCar size={12} color="var(--color-error-700)" />
              Sin auto
            </span>
          )}

          {match.hasCar && match.availableSeats != null && (
            <span className="match-card__badge match-card__badge--neutral">
              <IconSeat size={12} color="var(--color-badge-blue-text)" />
              {match.availableSeats}{' '}
              {match.availableSeats === 1 ? 'asiento' : 'asientos'}
            </span>
          )}

          {!match.hasCar && match.hasSimilarSchedule && (
            <span className="match-card__badge match-card__badge--neutral">
              <IconClockOutline
                size={12}
                color="var(--color-badge-blue-text)"
              />
              Horarios similares
            </span>
          )}
        </div>
      </div>

      <div className="match-card__side">
        <div className="match-card__compat">
          <CompatibilityRing percent={match.compatibilityPercent} />
          <span className="match-card__compat-label text-body-3">
            Compatibilidad
          </span>
        </div>
        <IconChevronRight size={16} color="var(--color-grey-300)" />
      </div>
    </button>
  );
}

export default MatchCard;
