import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { TripListCard } from '../../components/triplistcard';
import ConexiaLoader from '../../components/ConexiaLoader';
import { getProfile } from '../../lib/profileApi';
import {
  getMyTrips,
  type TripDetail,
  type TripScope,
} from '../../lib/tripsApi';
import tripsHeader from '../../assets/images/trips-header.png';
import publishTripCar from '../../assets/images/publish-trip-car.png';
import './index.css';
import { TravelIntentCard } from '../../components/travelintentcard';
import { QuickActionsDrawer } from '../../components/quickactionsdrawer';
import {
  getMyTravelIntents,
  type TravelIntent,
} from '../../lib/travelIntentsApi';

type LoadStatus = 'loading' | 'ready' | 'error';

const TABS: { scope: TripScope; label: string }[] = [
  { scope: 'upcoming', label: 'Próximos viajes' },
  { scope: 'history', label: 'Historial' },
];

export function Trips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [scope, setScope] = useState<TripScope>('upcoming');
  const [reloadKey, setReloadKey] = useState(0);
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [intents, setIntents] = useState<TravelIntent[]>([]);
  const [hasCar, setHasCar] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [intentCreated] = useState(
    () => (location.state as { intentCreated?: boolean } | null)?.intentCreated,
  );

  // Se limpia el state para que el aviso no vuelva a aparecer al recargar
  useEffect(() => {
    if (intentCreated) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [intentCreated, navigate, location.pathname]);

  useEffect(() => {
    if (!user) return;

    // Si el usuario cambia de pestaña antes de que termine el pedido, se
    // ignora la respuesta vieja
    let ignore = false;

    Promise.all([
      getMyTrips(scope),
      scope === 'upcoming'
        ? getMyTravelIntents()
        : Promise.resolve<TravelIntent[]>([]),
      getProfile(),
    ])
      .then(([tripsData, intentsData, profile]) => {
        if (ignore) return;
        setTrips(tripsData);
        setIntents(intentsData.filter((intent) => intent.status === 'ACTIVE'));
        setHasCar(Boolean(profile?.hasCar));
        setStatus('ready');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al cargar los viajes:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, scope, reloadKey]);

  const handleTabChange = (next: TripScope) => {
    if (next === scope) return;
    setStatus('loading');
    setScope(next);
  };

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const isHistory = scope === 'history';

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

      {intentCreated && (
        <p className="trips__success-message" role="status">
          ¡Listo! Tu intención de viaje está activa.
        </p>
      )}

      <div className="trips__tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.scope}
            type="button"
            role="tab"
            aria-selected={tab.scope === scope}
            className={`trips__tab${tab.scope === scope ? ' trips__tab--active' : ''}`}
            onClick={() => handleTabChange(tab.scope)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <div className="trips__status loading-area">
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
          <section className="trips__publish-card">
            <div className="trips__publish-text">
              <h2 className="text-body-1-bold">¿Vas a la facultad?</h2>
              <p className="trips__publish-description">
                {hasCar
                  ? 'Publicá un viaje y compartí asientos, o avisá que necesitás uno'
                  : 'Avisá cuándo necesitás viajar y encontrá quién te lleve'}
              </p>
              <div className="trips__publish-actions">
                <Button
                  type="button"
                  variant="fulfilled"
                  size="medium"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  Publicar viaje
                </Button>
              </div>
            </div>
            <img src={publishTripCar} alt="" className="trips__publish-image" />
          </section>

          {!isHistory && intents.length > 0 && (
            <section className="trips__list-section">
              <h2 className="trips__section-title">Mis intenciones de viaje</h2>
              <ul className="trips__list">
                {intents.map((intent) => (
                  <li key={intent.id}>
                    <TravelIntentCard intent={intent} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="trips__list-section">
            <h2 className="trips__section-title">
              {isHistory ? 'Historial' : 'Próximos viajes'}
            </h2>
            {trips.length === 0 ? (
              <EmptyTripsState
                title={
                  isHistory
                    ? 'Todavía no tenés viajes en el historial'
                    : 'No hay próximos viajes'
                }
                subtitle={
                  isHistory
                    ? 'Los viajes que ya salieron van a aparecer acá.'
                    : 'Publicá un viaje o avisá que necesitás uno y van a aparecer acá.'
                }
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

      {isDrawerOpen && (
        <QuickActionsDrawer
          hasCar={hasCar}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
