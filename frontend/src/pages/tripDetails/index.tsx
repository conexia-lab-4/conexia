import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { RouteTimeline } from '../../components/routetimeline';
import { Avatar } from '../../components/avatar';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconClock } from '../../assets/icons/IconClock';
import { IconCar } from '../../assets/icons/IconCar';
import { IconPhone } from '../../assets/icons/IconPhone';
import {
  getTrip,
  joinTrip,
  leaveTrip,
  type TripDetail,
  type TripPassenger,
} from '../../lib/tripsApi';
import {
  formatSeats,
  formatTime,
  formatTripDateTime,
  getPersonName,
} from '../../lib/tripFormat';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';
type ParticipationAction = 'join' | 'leave';

function getSeatsLabel(availableSeats: number): string {
  if (availableSeats <= 0) return 'Sin lugares libres';
  return `${formatSeats(availableSeats)} ${availableSeats === 1 ? 'libre' : 'libres'}`;
}

function getPassengerLocation(passenger: TripPassenger): string | null {
  const parts = [
    passenger.pickupAddress && `Recoge en ${passenger.pickupAddress}`,
    passenger.dropoffAddress && `Deja en ${passenger.dropoffAddress}`,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function TripDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTrip = useCallback(() => {
    getTrip(id)
      .then((data) => {
        setTrip(data);
        setStatus('ready');
      })
      .catch((error: Error) => {
        console.error('Error al cargar el viaje:', error);
        setLoadError(error.message);
        setStatus('error');
      });
  }, [id]);

  useEffect(() => {
    if (!user) return;
    loadTrip();
  }, [user, loadTrip]);

  const handleRetry = () => {
    setStatus('loading');
    loadTrip();
  };

  const handleParticipation = async (action: ParticipationAction) => {
    if (!trip || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (action === 'join') {
        await joinTrip(trip.id);
      } else {
        await leaveTrip(trip.id);
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error, intentá de nuevo',
      );
    }
    // El POST no devuelve el viaje, y si falló por falta de lugares también
    // conviene refrescar: se vuelve a pedir para actualizar pasajeros y lugares
    try {
      setTrip(await getTrip(trip.id));
    } catch (error) {
      console.error('Error al actualizar el viaje:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDriver = trip?.isDriver ?? false;
  const isFull = trip !== null && trip.availableSeats <= 0;

  const driverProfile = trip?.driver.studentProfile;
  const car = [driverProfile?.carModel, driverProfile?.carColor]
    .filter(Boolean)
    .join(' · ');
  const driverPhone = driverProfile?.phone;

  return (
    <div className="trip-detail">
      <header className="trip-detail__header">
        <button
          type="button"
          className="trip-detail__back"
          onClick={() => navigate(-1)}
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
          <p>{loadError ?? 'No pudimos cargar el viaje.'}</p>
          <button
            type="button"
            className="trip-detail__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && trip && (
        <>
          <section className="trip-detail__summary">
            <div className="trip-detail__route">
              <span className="trip-detail__date-chip">
                {formatTripDateTime(trip.departureTime)}
              </span>
              <RouteTimeline
                origin={trip.origin}
                destination={trip.destination}
                seatsLabel={getSeatsLabel(trip.availableSeats)}
              />
            </div>

            <div className="trip-detail__driver">
              <Avatar
                className="trip-detail__driver-avatar"
                photoUrl={trip.driver.photoUrl}
                name={trip.driver.displayName}
              />
              <span className="trip-detail__driver-name">
                {getPersonName(trip.driver.displayName)}
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
                <dd>{formatTime(trip.departureTime)}</dd>
              </div>
              <div className="trip-detail__info-row">
                <dt>
                  <IconClock size={18} color="var(--color-grey-400)" />
                  Hora de llegada
                </dt>
                <dd>{formatTime(trip.arrivalTime)}</dd>
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
              {driverPhone && (
                <div className="trip-detail__info-row">
                  <dt>
                    <IconPhone size={18} color="var(--color-grey-400)" />
                    Teléfono
                  </dt>
                  <dd>{driverPhone}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="trip-detail__card">
            <div className="trip-detail__card-header">
              <h2 className="trip-detail__card-title">Pasajeros confirmados</h2>
              <span className="trip-detail__passenger-count">
                {trip.passengers.length}/{trip.capacity}
              </span>
            </div>
            {trip.passengers.length === 0 ? (
              <p className="trip-detail__muted">Todavía no hay pasajeros</p>
            ) : (
              <ul className="trip-detail__passengers">
                {trip.passengers.map((passenger) => {
                  const location = getPassengerLocation(passenger);

                  return (
                    <li key={passenger.id} className="trip-detail__passenger">
                      <Avatar
                        className="trip-detail__passenger-avatar"
                        photoUrl={passenger.user.photoUrl}
                        name={passenger.user.displayName}
                      />
                      <div className="trip-detail__passenger-info">
                        <span className="trip-detail__passenger-name">
                          {getPersonName(passenger.user.displayName)}
                          {passenger.userId === user?.uid && ' (vos)'}
                        </span>
                        {location && (
                          <span className="trip-detail__passenger-location">
                            {location}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="trip-detail__actions">
            {actionError && (
              <p className="trip-detail__error text-body-3" role="alert">
                {actionError}
              </p>
            )}

            {isDriver ? (
              <p className="trip-detail__muted trip-detail__driver-note">
                Sos el conductor de este viaje
              </p>
            ) : (
              <>
                {/* Sin funcionalidad por ahora: el chat queda para otro ticket */}
                <Button type="button" variant="fulfilled" size="large-wide">
                  Enviar mensaje al conductor
                </Button>

                {trip.isHistorical && (
                  <p className="trip-detail__muted trip-detail__driver-note">
                    Este viaje ya salió
                  </p>
                )}

                {!trip.isHistorical &&
                  (trip.isParticipant ? (
                    <Button
                      type="button"
                      variant="danger"
                      size="large-wide"
                      onClick={() => handleParticipation('leave')}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saliendo...' : 'Salir del viaje'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outlined"
                      size="large-wide"
                      onClick={() => handleParticipation('join')}
                      disabled={isSubmitting || isFull}
                    >
                      {isFull
                        ? 'Sin lugares disponibles'
                        : isSubmitting
                          ? 'Sumándote...'
                          : 'Sumarme al viaje'}
                    </Button>
                  ))}
              </>
            )}
          </div>
        </>
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
