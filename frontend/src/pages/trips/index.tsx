import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { TripListCard } from '../../components/triplistcard';
import ConexiaLoader from '../../components/ConexiaLoader';
import { getProfile } from '../../lib/profileApi';
import { getUpcomingTrips, type TripDetail } from '../../lib/tripsApi';
import tripsHeader from '../../assets/images/trips-header.png';
import publishTripCar from '../../assets/images/publish-trip-car.png';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [hasCar, setHasCar] = useState(false);

  const loadTrips = useCallback(() => {
    Promise.all([getUpcomingTrips(), getProfile()])
      .then(([tripsData, profile]) => {
        setTrips(tripsData);
        setHasCar(Boolean(profile?.hasCar));
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Error al cargar los viajes:', error);
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTrips();
  }, [user, loadTrips]);

  const handleRetry = () => {
    setStatus('loading');
    loadTrips();
  };

  return (
    <div className="trips">
      <header className="trips__header">
        <div className="trips__header-text">
          <h1 className="text-h4-bold">Viajes</h1>
          <p className="trips__subtitle">
            Organizá tus viajes y conectá con estudiantes que comparten tu
            recorrido
          </p>
        </div>
        <img src={tripsHeader} alt="" className="trips__header-image" />
      </header>

      <div className="trips__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected="true"
          className="trips__tab trips__tab--active"
        >
          Próximos viajes
        </button>
        {/* Historial queda fuera de alcance por ahora */}
        <button
          type="button"
          role="tab"
          aria-selected="false"
          className="trips__tab"
          disabled
        >
          Historial
        </button>
      </div>

      {status === 'loading' && (
        <div className="trips__status">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="trips__status trips__status--error">
          <p>No pudimos cargar los viajes. Intentá de nuevo más tarde.</p>
          <button
            type="button"
            className="trips__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          {hasCar && (
            <section className="trips__publish-card">
              <div className="trips__publish-text">
                <h2 className="text-body-1-bold">¿Vas a la facultad?</h2>
                <p className="trips__publish-description">
                  Publicá un viaje y compartí asientos con otros estudiantes
                </p>
                <Button
                  type="button"
                  variant="fulfilled"
                  size="medium"
                  onClick={() => navigate('/trips/new')}
                >
                  Publicar viaje
                </Button>
              </div>
              <img
                src={publishTripCar}
                alt=""
                className="trips__publish-image"
              />
            </section>
          )}

          <section className="trips__list-section">
            <h2 className="trips__section-title">Próximos viajes</h2>
            {trips.length === 0 ? (
              <EmptyTripsState
                title="No hay viajes próximos"
                subtitle="Cuando otros estudiantes publiquen viajes, van a aparecer acá."
              />
            ) : (
              <ul className="trips__list">
                {trips.map((trip) => (
                  <li key={trip.id}>
                    <TripListCard trip={trip} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
