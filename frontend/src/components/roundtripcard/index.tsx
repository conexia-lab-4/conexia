import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import { Avatar } from '../avatar';
import { RouteTimeline } from '../routetimeline';
import type {
  RoundTripLeg,
  RoundTripWithMatches,
} from '../../lib/roundTripsApi';
import {
  getLegId,
  getLegLabel,
  getLegScoreLabel,
  getLegStatusLabel,
} from '../../lib/roundTripRules';
import {
  formatDayNumber,
  formatTime,
  formatWeekdayShort,
  getPersonName,
} from '../../lib/tripFormat';
import '../triplistcard/index.css';
import './index.css';

interface RoundTripGroupProps {
  roundTrip: RoundTripWithMatches;
  // La tarjeta estándar del tramo, si está en las listas; si no, null
  renderLeg: (leg: RoundTripLeg) => ReactNode;
}

// Tarjeta simple para un tramo que no está en las listas (por ejemplo, una
// intención que ya se confirmó)
function LegCard({ leg }: { leg: RoundTripLeg }) {
  const to = leg.tripId
    ? `/trips/${leg.tripId}`
    : `/trips/intents/${leg.travelIntentId}`;

  return (
    <Link to={to} className="trip-list-card">
      <div className="trip-list-card__date">
        <span className="text-body-3">
          {formatWeekdayShort(leg.departureTime)}
        </span>
        <span className="trip-list-card__day">
          {formatDayNumber(leg.departureTime)}
        </span>
        <span className="text-body-3">{formatTime(leg.departureTime)}</span>
      </div>
      <div className="trip-list-card__route">
        <RouteTimeline origin={leg.origin} destination={leg.destination} />
      </div>
      <span className="trip-list-card__chevron">
        <IconChevronDown size={16} color="var(--color-grey-300)" />
      </span>
    </Link>
  );
}

// Tramo, estado, persona y porcentaje de ese tramo
function LegInfo({ leg }: { leg: RoundTripLeg }) {
  const person = leg.match?.person ?? null;

  return (
    <div className="round-trip-group__info text-body-3">
      <span className="text-body-3-bold">{getLegLabel(leg)}</span>
      <span
        className={`round-trip-group__status round-trip-group__status--${leg.status.toLowerCase()}`}
      >
        {getLegStatusLabel(leg)}
      </span>
      <span className="round-trip-group__person">
        {person ? (
          <>
            <Avatar
              className="round-trip-group__avatar"
              photoUrl={person.photoUrl}
              name={person.displayName}
            />
            {getPersonName(person.displayName)}
          </>
        ) : (
          'Sin coincidencia por ahora'
        )}
      </span>
      <span
        className={`round-trip-group__score${
          leg.status === 'CONFIRMED'
            ? ' round-trip-group__score--confirmed'
            : ''
        }`}
      >
        {getLegScoreLabel(leg)}
      </span>
    </div>
  );
}

// Los tramos de un paquete propio, pegados en un solo bloque. La franja lleva
// al detalle del paquete. Con un solo tramo (el otro se eliminó) se ve suelto
export function RoundTripGroup({ roundTrip, renderLeg }: RoundTripGroupProps) {
  const legs = [...roundTrip.legs].sort((a, b) =>
    a.departureTime.localeCompare(b.departureTime),
  );
  const renderCard = (leg: RoundTripLeg) =>
    renderLeg(leg) ?? <LegCard leg={leg} />;

  if (legs.length === 1) return <>{renderCard(legs[0])}</>;

  return (
    <div className="round-trip-group">
      <Link
        to={`/trips/round-trips/${roundTrip.id}`}
        className="round-trip-group__header text-body-3-bold"
      >
        Ida y vuelta
        <span className="round-trip-group__chevron">
          <IconChevronDown size={16} color="var(--color-primary-800)" />
        </span>
      </Link>
      {legs.map((leg) => (
        <Fragment key={getLegId(leg) || leg.departureTime}>
          {renderCard(leg)}
          <LegInfo leg={leg} />
        </Fragment>
      ))}
    </div>
  );
}
