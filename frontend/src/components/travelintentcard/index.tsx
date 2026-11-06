import { Link } from 'react-router-dom';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import { RouteTimeline } from '../routetimeline';
import type { TravelIntent } from '../../lib/travelIntentsApi';
import {
  formatDayNumber,
  formatTime,
  formatWeekdayShort,
} from '../../lib/tripFormat';
import '../triplistcard/index.css';
import './index.css';

interface TravelIntentCardProps {
  intent: TravelIntent;
}

export function TravelIntentCard({ intent }: TravelIntentCardProps) {
  return (
    <Link to={`/trips/intents/${intent.id}`} className="trip-list-card">
      <div className="trip-list-card__date">
        <span className="text-body-3">
          {formatWeekdayShort(intent.departureTime)}
        </span>
        <span className="trip-list-card__day">
          {formatDayNumber(intent.departureTime)}
        </span>
        <span className="text-body-3">{formatTime(intent.departureTime)}</span>
      </div>

      <div className="trip-list-card__route">
        <RouteTimeline
          origin={intent.origin}
          destination={intent.destination}
        />
      </div>

      <span className="travel-intent-card__badge">Buscando viaje</span>

      <span className="trip-list-card__chevron">
        <IconChevronDown size={16} color="var(--color-grey-300)" />
      </span>
    </Link>
  );
}
