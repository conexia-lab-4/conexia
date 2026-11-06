import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { Button } from '../../components/button';
import { RouteTimeline } from '../../components/routetimeline';
import { DeleteScheduleDialog } from '../../components/deletescheduledialog';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconBack } from '../../assets/icons/IconBack';
import { IconClock } from '../../assets/icons/IconClock';
import {
  deleteTravelIntent,
  getTravelIntent,
  type TravelIntent,
  type TravelIntentStatus,
} from '../../lib/travelIntentsApi';
import { formatTime, formatTripDateTime } from '../../lib/tripFormat';
import '../../components/travelintentcard/index.css';
import '../tripDetails/index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

const STATUS_NOTES: Record<Exclude<TravelIntentStatus, 'ACTIVE'>, string> = {
  FULFILLED: 'Ya te sumaste a un viaje con esta intención',
  CANCELLED: 'Eliminaste esta intención',
  EXPIRED: 'Esta intención ya venció',
};

export function IntentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [intent, setIntent] = useState<TravelIntent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadIntent = useCallback(() => {
    getTravelIntent(id)
      .then((data) => {
        setIntent(data);
        setStatus('ready');
      })
      .catch((error: Error) => {
        console.error('Error al cargar la intención:', error);
        setLoadError(error.message);
        setStatus('error');
      });
  }, [id]);

  useEffect(() => {
    if (!user) return;
    loadIntent();
  }, [user, loadIntent]);

  const handleRetry = () => {
    setStatus('loading');
    loadIntent();
  };

  const handleDelete = async () => {
    if (!intent || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteTravelIntent(intent.id);
      navigate('/trips', { replace: true });
    } catch (error) {
      setIsDeleteOpen(false);
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'No pudimos eliminar tu intención de viaje',
      );
      // Pudo aceptarse un match mientras tanto: se refresca lo que se muestra
      try {
        setIntent(await getTravelIntent(intent.id));
      } catch (refreshError) {
        console.error('Error al actualizar la intención:', refreshError);
      }
      setIsDeleting(false);
    }
  };

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
        <h1 className="text-h6">Detalle de la intención</h1>
      </header>

      {status === 'loading' && (
        <div className="trip-detail__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="trip-detail__status trip-detail__status--error">
          <p>{loadError ?? 'No pudimos cargar tu intención de viaje.'}</p>
          <button
            type="button"
            className="trip-detail__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && intent && (
        <>
          <section className="trip-detail__summary">
            <div className="trip-detail__route">
              <span className="trip-detail__date-chip">
                {formatTripDateTime(intent.departureTime)}
              </span>
              <RouteTimeline
                origin={intent.origin}
                destination={intent.destination}
              />
            </div>
            {intent.status === 'ACTIVE' && (
              <span className="travel-intent-card__badge">Buscando viaje</span>
            )}
          </section>

          <section className="trip-detail__card">
            <h2 className="trip-detail__card-title">Información del viaje</h2>
            <dl className="trip-detail__info">
              <div className="trip-detail__info-row">
                <dt>
                  <IconClock size={18} color="var(--color-grey-400)" />
                  Hora de salida
                </dt>
                <dd>{formatTime(intent.departureTime)}</dd>
              </div>
              <div className="trip-detail__info-row">
                <dt>
                  <IconClock size={18} color="var(--color-grey-400)" />
                  Hora de llegada
                </dt>
                <dd>{formatTime(intent.arrivalTime)}</dd>
              </div>
            </dl>
          </section>

          <div className="trip-detail__actions">
            {deleteError && (
              <p className="trip-detail__error text-body-3" role="alert">
                {deleteError}
              </p>
            )}

            {intent.status === 'ACTIVE' ? (
              <Button
                type="button"
                variant="danger"
                size="large-wide"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteOpen(true);
                }}
              >
                Eliminar intención
              </Button>
            ) : (
              <p className="trip-detail__muted trip-detail__driver-note">
                {STATUS_NOTES[intent.status]}
              </p>
            )}
          </div>
        </>
      )}

      {isDeleteOpen && (
        <DeleteScheduleDialog
          title="¿Eliminar esta intención?"
          message="Vas a dejar de recibir coincidencias para este viaje. Esta acción no se puede deshacer."
          isDeleting={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
