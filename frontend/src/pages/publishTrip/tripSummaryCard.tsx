import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconClock } from '../../assets/icons/IconClock';
import publishTripCar from '../../assets/images/publish-trip-car.png';
import { formatDateLabel } from './tripDates';

export interface SummaryStop {
  title: string;
  detail: string;
}

interface TripSummaryCardProps {
  origin: SummaryStop;
  destination: SummaryStop;
  date: string;
  departureTime: string;
  arrivalTime: string;
  note?: string;
}

export function TripSummaryCard({
  origin,
  destination,
  date,
  departureTime,
  arrivalTime,
  note,
}: TripSummaryCardProps) {
  return (
    <section className="trip-summary">
      <div className="trip-summary__route">
        <div className="trip-summary__stops">
          <div className="trip-summary__timeline" aria-hidden="true">
            <span className="trip-summary__dot trip-summary__dot--origin" />
            <span className="trip-summary__line" />
            <span className="trip-summary__dot trip-summary__dot--destination" />
          </div>
          <div className="trip-summary__stop-list">
            {[origin, destination].map((stop, index) => (
              <div key={index} className="trip-summary__stop">
                <span className="text-body-2-bold">{stop.title}</span>
                <span className="trip-summary__detail text-body-3">
                  {stop.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
        <img src={publishTripCar} alt="" className="trip-summary__car" />
      </div>

      <div className="trip-summary__divider" />

      <div className="trip-summary__facts">
        <div className="trip-summary__item">
          <IconCalendar size={20} color="var(--color-primary-600)" />
          <div className="trip-summary__item-text">
            <span className="text-body-2-bold">Fecha</span>
            <span className="trip-summary__detail text-body-3">
              {formatDateLabel(date)}
            </span>
          </div>
        </div>
        <div className="trip-summary__vertical-divider" />
        <div className="trip-summary__item">
          <IconClock size={20} color="var(--color-primary-600)" />
          <div className="trip-summary__item-text">
            <span className="text-body-2-bold">Horario</span>
            <span className="trip-summary__detail text-body-3">
              {departureTime} → {arrivalTime}
            </span>
            {note && (
              <span className="trip-summary__detail text-body-3">{note}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
