import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { RouteTimeline } from '../../components/routetimeline';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCar } from '../../assets/icons/IconCar';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconClock } from '../../assets/icons/IconClock';
import {
  acceptMatch,
  getTravelMatches,
  rejectMatch,
  type TravelMatch,
} from '../../lib/matchesApi';
import {
  formatSeats,
  formatTime,
  formatTripDateTime,
  getDisplayName,
  getInitials,
} from '../../lib/tripFormat';
import '../tripDetails/index.css';

type LoadStatus = 'loading' | 'ready' | 'unavailable' | 'error';
type MatchAction = 'accept' | 'reject';

function getSeatsLabel(availableSeats: number): string {
  if (availableSeats <= 0) return 'Sin lugares libres';
  return `${formatSeats(availableSeats)} ${availableSeats === 1 ? 'libre' : 'libres'}`;
}

export function MatchDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [match, setMatch] = useState<TravelMatch | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<MatchAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    let ignore = false;

    getTravelMatches()
      .then((matches) => {
        if (ignore) return;
        const found = matches.find((item) => item.id === id) ?? null;
        setMatch(found);
        setStatus(found ? 'ready' : 'unavailable');
      })
      .catch((error) => {
        if (ignore) return;
        console.error('Error al cargar la coincidencia:', error);
        setStatus('error');
      });

    return () => {
      ignore = true;
    };
  }, [user, id, reloadKey]);

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const handleAction = async (action: MatchAction) => {
    if (!match || pendingAction) return;
    setPendingAction(action);
    setActionError(null);

    try {
      if (action === 'accept') {
        await acceptMatch(match.id);
        navigate('/trips');
      } else {
        await rejectMatch(match.id);
        navigate('/matches');
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error, intentá de nuevo',
      );
      setPendingAction(null);
    }
  };

  const driver = match?.trip.driver;
  const profile = driver?.profile;
  const car = [profile?.carModel, profile?.carColor]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="trip-detail">
      <header className="trip-detail__header">
        <button
          type="button"
          className="trip-detail__back"
          onClick={() => navigate('/matches')}
          aria-label="Volver"
        >
          <IconBack size={24} color="var(--color-black)" />
        </button>
        <h1 className="text-h6">Detalle del viaje</h1>
      </header>

      {status === 'loading' && (
        <div className="trip-detail__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="trip-detail__status trip-detail__status--error">
          <p>No pudimos cargar la coincidencia.</p>
          <button
            type="button"
            className="trip-detail__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="trip-detail__status">
          <p>Esta coincidencia ya no está disponible.</p>
          <Button
            type="button"
            variant="outlined"
            size="medium"
            onClick={() => navigate('/matches')}
          >
            Volver a Matches
          </Button>
        </div>
      )}

      {status === 'ready' && match && driver && (
        <>
          <section className="trip-detail__summary">
            <div className="trip-detail__route">
              <span className="trip-detail__date-chip">
                {formatTripDateTime(match.trip.departureTime)}
              </span>
              <RouteTimeline
                origin={match.trip.origin}
                destination={match.trip.destination}
                seatsLabel={getSeatsLabel(match.trip.availableSeats)}
              />
            </div>

            <div className="trip-detail__driver">
              <span className="trip-detail__driver-avatar">
                {getInitials(driver.email)}
              </span>
              <span className="trip-detail__driver-name">
                {getDisplayName(driver.email)}
              </span>
              <span className="trip-detail__verified">
                <IconCheck size={12} color="var(--color-success-500)" />
                Verificado
              </span>
            </div>
          </section>

          <section className="trip-detail__card">
            <h2 className="trip-detail__card-title">Información del viaje</h2>
            <dl className="trip-detail__info">
              <div className="trip-detail__info-row">
                <dt>
                  <IconClock size={18} color="var(--color-grey-400)" />
                  Hora de salida
                </dt>
                <dd>{formatTime(match.trip.departureTime)}</dd>
              </div>
              <div className="trip-detail__info-row">
                <dt>
                  <IconClock size={18} color="var(--color-grey-400)" />
                  Hora de llegada
                </dt>
                <dd>{formatTime(match.trip.arrivalTime)}</dd>
              </div>
              {car && (
                <div className="trip-detail__info-row">
                  <dt>
                    <IconCar size={18} color="var(--color-grey-400)" />
                    Auto
                  </dt>
                  <dd>{car}</dd>
                </div>
              )}
              <div className="trip-detail__info-row">
                <dt>
                  <IconCheck size={18} color="var(--color-grey-400)" />
                  Compatibilidad
                </dt>
                <dd>{Math.round(match.score)}%</dd>
              </div>
            </dl>
          </section>

          <div className="trip-detail__actions">
            {actionError && (
              <p className="trip-detail__error text-body-3" role="alert">
                {actionError}
              </p>
            )}

            <Button
              type="button"
              variant="fulfilled"
              size="large-wide"
              onClick={() => handleAction('accept')}
              disabled={pendingAction !== null}
            >
              {pendingAction === 'accept' ? 'Aceptando...' : 'Aceptar'}
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="large-wide"
              onClick={() => handleAction('reject')}
              disabled={pendingAction !== null}
            >
              {pendingAction === 'reject' ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </div>
        </>
      )}

      <NavBar activeItem="matches" />
    </div>
  );
}
