import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { RouteTimeline } from '../../components/routetimeline';
import { Avatar } from '../../components/avatar';
import { DeleteScheduleDialog } from '../../components/deletescheduledialog';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconBack } from '../../assets/icons/IconBack';
import { useRoundTrip } from '../../hooks/useRoundTrips';
import type { RoundTripKind, RoundTripLeg } from '../../lib/roundTripsApi';
import {
  canAcceptLeg,
  checkCancelLeg,
  getJointScoreLabel,
  getLegId,
  getLegLabel,
  getLegScoreLabel,
  getLegStatusLabel,
} from '../../lib/roundTripRules';
import {
  formatTime,
  formatTripDateTime,
  getPersonName,
} from '../../lib/tripFormat';
import '../tripDetails/index.css';
import './index.css';

interface LegSectionProps {
  kind: RoundTripKind;
  leg: RoundTripLeg;
  isBusy: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

function LegSection({
  kind,
  leg,
  isBusy,
  onAccept,
  onCancel,
}: LegSectionProps) {
  const person = leg.match?.person ?? null;
  // En un paquete de búsqueda la otra persona conduce; en uno de viaje, viaja
  const role = kind === 'INTENT' ? 'Conductor' : 'Pasajero';
  const car = [person?.carModel, person?.carColor].filter(Boolean).join(' · ');
  const isTrip = Boolean(leg.tripId);
  const cancelCheck = checkCancelLeg(leg);
  const detailPath = isTrip
    ? `/trips/${leg.tripId}`
    : `/trips/intents/${leg.travelIntentId}`;

  return (
    <section className="trip-detail__card">
      <div className="trip-detail__card-header">
        <h2 className="trip-detail__card-title">{getLegLabel(leg)}</h2>
        <span
          className={`round-trip-detail__status round-trip-detail__status--${leg.status.toLowerCase()}`}
        >
          {getLegStatusLabel(leg)}
        </span>
      </div>

      <span className="trip-detail__date-chip">
        {formatTripDateTime(leg.departureTime)}
      </span>
      <RouteTimeline origin={leg.origin} destination={leg.destination} />
      <p className="trip-detail__muted">
        Sale {formatTime(leg.departureTime)} · Llega{' '}
        {formatTime(leg.arrivalTime)}
      </p>

      <div className="round-trip-detail__person">
        {person ? (
          <>
            <Avatar
              className="trip-detail__passenger-avatar"
              photoUrl={person.photoUrl}
              name={person.displayName}
            />
            <span className="round-trip-detail__person-text">
              <span className="trip-detail__passenger-name">
                {getPersonName(person.displayName)}
              </span>
              <span className="trip-detail__passenger-location">
                {[role, car].filter(Boolean).join(' · ')}
              </span>
            </span>
          </>
        ) : (
          <span className="trip-detail__muted round-trip-detail__person-text">
            Sin coincidencia por ahora
          </span>
        )}
        <span className="round-trip-detail__score">
          {getLegScoreLabel(leg)}
        </span>
      </div>

      <div className="trip-detail__actions">
        {canAcceptLeg(kind, leg) && (
          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={isBusy}
            onClick={onAccept}
          >
            {isBusy ? 'Aceptando...' : 'Aceptar propuesta'}
          </Button>
        )}

        <Button
          type="button"
          variant="danger"
          size="large-wide"
          disabled={isBusy || !cancelCheck.allowed}
          onClick={onCancel}
        >
          {isTrip ? 'Eliminar viaje' : 'Eliminar intención'}
        </Button>
        {!cancelCheck.allowed && (
          <p className="trip-detail__delete-note">{cancelCheck.reason}</p>
        )}

        <Link
          to={detailPath}
          className="round-trip-detail__link text-body-2-bold"
        >
          {isTrip ? 'Ver detalle del viaje' : 'Ver detalle de la intención'}
        </Link>
      </div>
    </section>
  );
}

export function RoundTripDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    roundTrip,
    status,
    actionError,
    clearActionError,
    busyLegId,
    retry,
    accept,
    cancel,
  } = useRoundTrip(id);
  const [legToCancel, setLegToCancel] = useState<RoundTripLeg | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleAccept = async (leg: RoundTripLeg) => {
    setNotice(null);
    if (await accept(leg)) {
      setNotice(
        `Aceptaste la propuesta de la ${getLegLabel(leg).toLowerCase()}.`,
      );
    }
  };

  const handleConfirmCancel = async () => {
    if (!legToCancel) return;
    const leg = legToCancel;
    const ok = await cancel(leg);
    setLegToCancel(null);
    if (ok) {
      setNotice(`Eliminaste la ${getLegLabel(leg).toLowerCase()}.`);
    }
  };

  // Primero el tramo que sale antes: la ida y después la vuelta
  const legs = roundTrip
    ? [...roundTrip.legs].sort((a, b) =>
        a.departureTime.localeCompare(b.departureTime),
      )
    : [];

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
        <h1 className="text-h6">Detalle de ida y vuelta</h1>
      </header>

      {status === 'loading' && (
        <div className="trip-detail__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="trip-detail__status trip-detail__status--error">
          <p>No pudimos cargar el viaje de ida y vuelta.</p>
          <button
            type="button"
            className="trip-detail__retry-button"
            onClick={retry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="trip-detail__status">
          <p>Este viaje de ida y vuelta ya no está disponible.</p>
          <Button
            type="button"
            variant="outlined"
            size="medium"
            onClick={() => navigate('/trips')}
          >
            Volver a Viajes
          </Button>
        </div>
      )}

      {status === 'ready' && roundTrip && (
        <>
          <section className="trip-detail__card">
            <div className="trip-detail__card-header">
              <h2 className="trip-detail__card-title">
                {roundTrip.kind === 'TRIP'
                  ? 'Viaje de ida y vuelta'
                  : 'Búsqueda de ida y vuelta'}
              </h2>
              <span className="round-trip-detail__joint">
                {getJointScoreLabel(roundTrip)}
              </span>
            </div>
            <p className="trip-detail__muted">
              Compatibilidad conjunta.{' '}
              {roundTrip.jointScore === null
                ? 'Se calcula cuando los dos tramos tienen una coincidencia.'
                : 'Se calcula con las coincidencias de ambos tramos.'}
            </p>
          </section>

          {notice && (
            <p className="round-trip-detail__notice text-body-3" role="status">
              {notice}
            </p>
          )}

          {actionError && (
            <p className="trip-detail__error text-body-3" role="alert">
              {actionError}
            </p>
          )}

          {legs.map((leg) => (
            <LegSection
              key={getLegId(leg) || leg.departureTime}
              kind={roundTrip.kind}
              leg={leg}
              isBusy={busyLegId === getLegId(leg)}
              onAccept={() => handleAccept(leg)}
              onCancel={() => {
                clearActionError();
                setNotice(null);
                setLegToCancel(leg);
              }}
            />
          ))}
        </>
      )}

      {legToCancel && (
        <DeleteScheduleDialog
          title={
            legToCancel.tripId
              ? '¿Eliminar este viaje?'
              : '¿Eliminar esta intención?'
          }
          message={
            legToCancel.tripId
              ? 'Solo se elimina este tramo; el otro no se modifica. Sus pasajeros van a dejar de verlo y el chat del viaje se va a borrar. Esta acción no se puede deshacer.'
              : 'Solo se elimina este tramo; el otro no se modifica. Vas a dejar de recibir coincidencias para este tramo. Esta acción no se puede deshacer.'
          }
          isDeleting={busyLegId !== null}
          onConfirm={handleConfirmCancel}
          onCancel={() => setLegToCancel(null)}
        />
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
