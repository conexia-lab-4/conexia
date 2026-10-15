import type { Match } from '../../lib/matchesApi';
import { CompatibilityRing } from '../compatibilityRing';
import { IconMapPin } from '../../assets/icons/IconMapPin';
import { IconCar } from '../../assets/icons/IconCar';
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
  const yearLabel =
    match.year === null
      ? null
      : (YEAR_LABELS[match.year] ?? `${match.year}° año`);
  const subtitle = [match.career, yearLabel].filter(Boolean).join(' ');

  return (
    <button type="button" className="match-card" onClick={onClick}>
      <div className="match-card__avatar-wrapper">
        <span className="match-card__avatar">{match.initials}</span>
      </div>

      <div className="match-card__info">
        <span className="match-card__name text-body-2-bold">{match.name}</span>
        {subtitle && (
          <span className="match-card__subtitle text-body-3">{subtitle}</span>
        )}
        {match.campus && (
          <span className="match-card__location text-body-3">
            <IconMapPin size={12} color="var(--color-grey-400)" />
            {match.campus}
          </span>
        )}

        <div className="match-card__badges">
          <span className="match-card__badge match-card__badge--positive">
            <IconCar size={12} color="var(--color-success-700)" />
            <span className="match-card__badge-text">Con auto</span>
          </span>

          <span className="match-card__badge match-card__badge--neutral">
            <IconSeat size={12} color="var(--color-badge-blue-text)" />
            <span className="match-card__badge-text">
              {match.availableSeats}{' '}
              {match.availableSeats === 1 ? 'asiento' : 'asientos'}
            </span>
          </span>
        </div>
      </div>

      <div className="match-card__side">
        <div className="match-card__compat">
          <CompatibilityRing percent={match.compatibilityPercent} />
          <span className="match-card__compat-label">Compatibilidad</span>
        </div>
        <IconChevronRight size={16} color="var(--color-grey-300)" />
      </div>
    </button>
  );
}

export default MatchCard;
