import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { EmptyTripsState } from '../../components/emptytripsstate';
import { TripListCard } from '../../components/triplistcard';
import ConexiaLoader from '../../components/ConexiaLoader';
import { PublishTripCard } from '../../components/publishtripcard';
import { getProfile } from '../../lib/profileApi';
import {
  getMyTrips,
  type TripDetail,
  type TripScope,
} from '../../lib/tripsApi';
import { IconChat } from '../../assets/icons/IconChat';
import tripsHeader from '../../assets/images/trips-header.png';
import './index.css';
import { TravelIntentCard } from '../../components/travelintentcard';
import { QuickActionsDrawer } from '../../components/quickactionsdrawer';
import { NotificationBell } from '../../components/notificationbell';
import { RoundTripGroup } from '../../components/roundtripcard';
import { useMyRoundTrips } from '../../hooks/useRoundTrips';
import type {
  RoundTripKind,
  RoundTripWithMatches,
} from '../../lib/roundTripsApi';
import {
  getMyTravelIntents,
  type TravelIntent,
} from '../../lib/travelIntentsApi';

type LoadStatus = 'loading' | 'ready' | 'error';

const TABS: { scope: TripScope; label: string }[] = [
  { scope: 'upcoming', label: 'Próximos viajes' },
  { scope: 'history', label: 'Historial' },
];

interface LegItem {
  id: string;
  roundTripId: string | null;
  departureTime: string;
}

interface ListItem {
  key: string;
  time: number;
  node: ReactNode;
}

function toListItem<T extends LegItem>(
  item: T,
  render: (item: T) => ReactNode,
): ListItem {
  return {
    key: item.id,
    time: new Date(item.departureTime).getTime(),
    node: render(item),
  };
}

// Un paquete se ubica en la lista según su primer tramo
function getRoundTripStart(roundTrip: RoundTripWithMatches): number {
  return Math.min(
    ...roundTrip.legs.map((leg) => new Date(leg.departureTime).getTime()),
  );
}

const renderTrip = (trip: TripDetail) => <TripListCard trip={trip} />;
const renderIntent = (intent: TravelIntent) => (
  <TravelIntentCard intent={intent} />
);

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
  const {
    roundTrips,
    status: roundTripsStatus,
    retry: retryRoundTrips,
  } = useMyRoundTrips();
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
  // Los paquetes se agrupan cuando ya se cargaron. Si fallan, todo se ve como
  // tarjetas sueltas y se ofrece reintentar
  const isGrouped = !isHistory && roundTripsStatus === 'ready';
  const isLoading =
    status === 'loading' || (!isHistory && roundTripsStatus === 'loading');

  // Solo se agrupan los tramos de paquetes propios: el pasajero de un viaje
  // ajeno lo ve como cualquier otro, porque no puede abrir ese paquete
  const ownedIds = new Set(roundTrips.map((roundTrip) => roundTrip.id));
  const isOwnedLeg = (item: LegItem) =>
    isGrouped && item.roundTripId !== null && ownedIds.has(item.roundTripId);

  const packageItems = (kind: RoundTripKind, renderCard: RenderLegCard) =>
    isGrouped
      ? roundTrips
          .filter((roundTrip) => roundTrip.kind === kind)
          .map((roundTrip) => ({
            key: roundTrip.id,
            time: getRoundTripStart(roundTrip),
            node: (
              <RoundTripGroup roundTrip={roundTrip} renderLeg={renderCard} />
            ),
          }))
      : [];

  const tripItems: ListItem[] = [
    ...trips
      .filter((trip) => !isOwnedLeg(trip))
      .map((trip) => toListItem(trip, renderTrip)),
    ...packageItems('TRIP', (leg) => {
      const trip = trips.find((item) => item.id === leg.tripId);
      return trip ? renderTrip(trip) : null;
    }),
  ];
  const intentItems: ListItem[] = [
    ...intents
      .filter((intent) => !isOwnedLeg(intent))
      .map((intent) => toListItem(intent, renderIntent)),
    ...packageItems('INTENT', (leg) => {
      const intent = intents.find((item) => item.id === leg.travelIntentId);
      return intent ? renderIntent(intent) : null;
    }),
  ];
  if (isGrouped) {
    tripItems.sort((a, b) => a.time - b.time);
    intentItems.sort((a, b) => a.time - b.time);
  }

  return (
    <div className="trips">
      <NotificationBell />
      <header className="trips__header">
        <div className="trips__header-text">
          <h1 className="text-h4-bold">Viajes</h1>
          <p className="trips__subtitle">
            Organizá tus viajes y conectá con estudiantes que comparten tu
            recorrido
          </p>
        </div>
        <img src={tripsHeader} alt="" className="trips__header-image" />
        <Link to="/chats" className="trips__chats-link" aria-label="Ver chats">
          <IconChat size={22} color="var(--color-primary-700)" />
        </Link>
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

      {isLoading && (
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

      {status === 'ready' && !isLoading && (
        <>
          <PublishTripCard
            hasCar={hasCar}
            onPublish={() => setIsDrawerOpen(true)}
          />

          {!isHistory && roundTripsStatus === 'error' && (
            <div className="trips__status trips__status--error">
              <p>No pudimos agrupar tus viajes de ida y vuelta.</p>
              <button
                type="button"
                className="trips__retry-button"
                onClick={retryRoundTrips}
              >
                Reintentar
              </button>
            </div>
          )}

          {!isHistory && intentItems.length > 0 && (
            <section className="trips__list-section">
              <h2 className="trips__section-title">Mis intenciones de viaje</h2>
              <ul className="trips__list">
                {intentItems.map((item) => (
                  <li key={item.key}>{item.node}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="trips__list-section">
            <h2 className="trips__section-title">
              {isHistory ? 'Historial' : 'Próximos viajes'}
            </h2>
            {tripItems.length === 0 ? (
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
                {tripItems.map((item) => (
                  <li key={item.key}>{item.node}</li>
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

type RenderLegCard = (leg: RoundTripWithMatches['legs'][number]) => ReactNode;
