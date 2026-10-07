import { Link } from 'react-router-dom';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import { RouteTimeline } from '../routetimeline';
import type { TripDetail } from '../../lib/tripsApi';
import {
  formatDayNumber,
  formatSeats,
  formatTime,
  formatWeekdayShort,
  getInitials,
} from '../../lib/tripFormat';
import './index.css';

interface TripListCardProps {
  trip: TripDetail;
}

export function TripListCard({ trip }: TripListCardProps) {
  const seatsLabel =
    trip.availableSeats > 0 ? formatSeats(trip.availableSeats) : 'Sin lugares';

  return (
    <Link to={`/trips/${trip.id}`} className="trip-list-card">
      <div className="trip-list-card__date">
        <span className="text-body-3">
          {formatWeekdayShort(trip.departureTime)}
        </span>
        <span className="trip-list-card__day">
          {formatDayNumber(trip.departureTime)}
        </span>
        <span className="text-body-3">{formatTime(trip.departureTime)}</span>
      </div>

      <div className="trip-list-card__route">
        <RouteTimeline
          origin={trip.origin}
          destination={trip.destination}
          seatsLabel={seatsLabel}
        />
      </div>

      <div className="trip-list-card__driver">
        <span className="trip-list-card__avatar">
          {getInitials(trip.driver.email)}
        </span>
        {trip.isDriver ? (
          <span className="trip-list-card__badge">
            <IconCheck size={12} color="var(--color-success-500)" />
            Conducís
          </span>
        ) : (
          trip.isParticipant && (
            <span className="trip-list-card__badge">
              <IconCheck size={12} color="var(--color-success-500)" />
              Confirmado
            </span>
          )
        )}
      </div>

      <span className="trip-list-card__chevron">
        <IconChevronDown size={16} color="var(--color-grey-300)" />
      </span>
    </Link>
  );
}
