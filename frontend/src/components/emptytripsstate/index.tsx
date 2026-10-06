import noTripsIllustration from '../../assets/images/no-trips-illustration.png';
import './index.css';

interface EmptyTripsStateProps {
  title?: string;
  subtitle?: string;
}

export function EmptyTripsState({
  title = 'Todavía no tenés viajes coordinados',
  subtitle = 'Cuando encuentres un match, tus próximos viajes van a aparecer acá.',
}: EmptyTripsStateProps) {
  return (
    <div className="empty-trips-state">
      <img
        src={noTripsIllustration}
        alt=""
        className="empty-trips-state__image"
      />
      <p className="empty-trips-state__title">{title}</p>
      <p className="empty-trips-state__subtitle">{subtitle}</p>
    </div>
  );
}
