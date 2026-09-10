import noTripsIllustration from '../../assets/images/no-trips-illustration.png';
import './index.css';

export function EmptyTripsState() {
  return (
    <div className="empty-trips-state">
      <img
        src={noTripsIllustration}
        alt=""
        className="empty-trips-state__image"
      />
      <p className="empty-trips-state__title">
        Todavía no tenés viajes coordinados
      </p>
      <p className="empty-trips-state__subtitle">
        Cuando encuentres un match, tus próximos viajes van a aparecer acá.
      </p>
    </div>
  );
}
