import { Link } from 'react-router-dom';
import { Avatar } from '../avatar';
import { CompatibilityRing } from '../compatibilityRing';
import { IconArrowsLeftRight } from '../../assets/icons/IconArrowsLeftRight';
import { IconChevronRight } from '../../assets/icons/IconChevronRight';
import { IconClockOutline } from '../../assets/icons/IconClockOutline';
import type { RoundTripWithMatches } from '../../lib/roundTripsApi';
import {
  getLegId,
  getLegLabel,
  getLegScoreLabel,
} from '../../lib/roundTripRules';
import { getPersonName } from '../../lib/tripFormat';
import './index.css';

interface RoundTripMatchCardProps {
  roundTrip: RoundTripWithMatches;
}

// Un paquete de búsqueda en Matches: la persona y el porcentaje de cada tramo.
// El porcentaje conjunto solo existe cuando los dos tramos tienen coincidencia
export function RoundTripMatchCard({ roundTrip }: RoundTripMatchCardProps) {
  const legs = [...roundTrip.legs].sort((a, b) =>
    a.departureTime.localeCompare(b.departureTime),
  );

  return (
    <Link
      to={`/matches/round-trips/${roundTrip.id}`}
      className="round-trip-match-card"
    >
      <div className="round-trip-match-card__header">
        <span className="round-trip-match-card__title text-body-1-bold">
          <IconArrowsLeftRight size={24} color="var(--color-primary-600)" />
          Ida y vuelta
        </span>
        <IconChevronRight size={16} color="var(--color-grey-300)" />
      </div>

      {roundTrip.jointScore !== null && (
        <div className="round-trip-match-card__joint">
          <CompatibilityRing percent={Math.round(roundTrip.jointScore)} />
          <span className="round-trip-match-card__muted text-body-2">
            Compatibilidad conjunta
          </span>
        </div>
      )}

      {legs.map((leg) => {
        const person = leg.match?.person ?? null;

        return (
          <div
            key={getLegId(leg) || leg.departureTime}
            className="round-trip-match-card__leg"
          >
            <span className="round-trip-match-card__pill text-body-2-bold">
              {getLegLabel(leg)}
            </span>
            {person ? (
              <>
                <Avatar
                  className="round-trip-match-card__avatar"
                  photoUrl={person.photoUrl}
                  name={person.displayName}
                />
                <span className="round-trip-match-card__name text-body-1-bold">
                  {getPersonName(person.displayName)}
                </span>
                <span className="round-trip-match-card__score text-body-1">
                  {getLegScoreLabel(leg)}
                </span>
              </>
            ) : (
              <span className="round-trip-match-card__pending text-body-1">
                <IconClockOutline size={20} color="var(--color-grey-400)" />
                {getLegScoreLabel(leg)}
              </span>
            )}
          </div>
        );
      })}
    </Link>
  );
}
