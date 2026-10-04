import { IconUsersThreeOutline } from '../../assets/icons/IconUsersThreeOutline';
import './index.css';

interface RouteTimelineProps {
  origin: string;
  destination: string;
  seatsLabel?: string;
}

export function RouteTimeline({
  origin,
  destination,
  seatsLabel,
}: RouteTimelineProps) {
  return (
    <div className="route-timeline">
      <div className="route-timeline__stop">
        <span className="route-timeline__dot route-timeline__dot--origin" />
        <span className="route-timeline__place">{origin}</span>
      </div>
      <div className="route-timeline__stop">
        <span className="route-timeline__dot route-timeline__dot--destination" />
        <span className="route-timeline__place">{destination}</span>
      </div>
      {seatsLabel && (
        <span className="route-timeline__seats">
          <IconUsersThreeOutline size={12} color="var(--color-success-700)" />
          {seatsLabel}
        </span>
      )}
    </div>
  );
}
