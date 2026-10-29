import { Button } from '../button';
import publishTripCar from '../../assets/images/publish-trip-car.png';
import './index.css';

interface PublishTripCardProps {
  hasCar: boolean;
  onPublish: () => void;
}

export function PublishTripCard({ hasCar, onPublish }: PublishTripCardProps) {
  return (
    <section className="publish-trip-card">
      <div className="publish-trip-card__text">
        <h2 className="text-body-1-bold">¿Vas a la facultad?</h2>
        <p className="publish-trip-card__description">
          {hasCar
            ? 'Publicá un viaje y compartí asientos, o avisá que necesitás uno'
            : 'Avisá cuándo necesitás viajar y encontrá quién te lleve'}
        </p>
        <div className="publish-trip-card__actions">
          <Button
            type="button"
            variant="fulfilled"
            size="medium"
            onClick={onPublish}
          >
            Publicar viaje
          </Button>
        </div>
      </div>
      <img src={publishTripCar} alt="" className="publish-trip-card__image" />
    </section>
  );
}
