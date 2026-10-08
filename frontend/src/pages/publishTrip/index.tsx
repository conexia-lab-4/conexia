import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { TimeField } from '../../components/timefield';
import { Button } from '../../components/button';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconCar } from '../../assets/icons/IconCar';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import { IconClock } from '../../assets/icons/IconClock';
import { IconMapPin } from '../../assets/icons/IconMapPin';
import { getProfile, type ProfileResponse } from '../../lib/profileApi';
import { getSubjects } from '../../lib/subjectsApi';
import { createTrip } from '../../lib/tripsApi';
import {
  formatDateLabel,
  getDateOptions,
  getScheduleOptions,
  nextOccurrence,
  suggestDepartureTime,
  toLocalDate,
  type ScheduleOption,
} from './tripDates';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';
type Step = 1 | 2 | 3;

interface TripForm {
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
}

const EMPTY_FORM: TripForm = {
  origin: '',
  destination: '',
  date: '',
  departureTime: '',
  arrivalTime: '',
};

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Ruta y horario' },
  { id: 2, label: 'Preferencias' },
  { id: 3, label: 'Revisar' },
];

function getDefaultDestination(profile: ProfileResponse | null): string {
  return [profile?.university, profile?.campus].filter(Boolean).join(' – ');
}

function formFromSchedule(form: TripForm, option: ScheduleOption): TripForm {
  return {
    ...form,
    date: nextOccurrence(option.dayOfWeek, option.startTime),
    departureTime: suggestDepartureTime(option.startTime),
    arrivalTime: option.startTime,
  };
}

function validateRoute(form: TripForm): string | null {
  if (!form.origin.trim()) return 'Ingresá desde dónde salís.';
  if (!form.destination.trim()) return 'Ingresá hacia dónde vas.';
  if (!form.date) return 'Elegí la fecha del viaje.';
  if (!form.departureTime) return 'Elegí el horario de salida.';
  if (!form.arrivalTime) return 'Elegí el horario de llegada.';

  const departure = toLocalDate(form.date, form.departureTime);
  const arrival = toLocalDate(form.date, form.arrivalTime);
  if (arrival <= departure) {
    return 'El horario de llegada tiene que ser posterior al de salida.';
  }
  if (departure <= new Date()) {
    return 'El horario de salida tiene que ser posterior a ahora.';
  }
  return null;
}

function formatSeats(seats: number): string {
  return `${seats} ${seats === 1 ? 'asiento' : 'asientos'}`;
}

export function PublishTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProfile(),
      // Los horarios son opcionales: si fallan, el viaje se carga a mano
      getSubjects().catch(() => []),
    ])
      .then(([profileData, subjects]) => {
        const options = getScheduleOptions(subjects);
        const baseForm: TripForm = {
          ...EMPTY_FORM,
          origin: profileData?.originAddress ?? '',
          destination: getDefaultDestination(profileData),
        };
        setProfile(profileData);
        setScheduleOptions(options);
        // Se precarga con la próxima clase de la cursada
        if (options.length > 0) {
          setForm(formFromSchedule(baseForm, options[0]));
          setSelectedScheduleId(options[0].id);
        } else {
          setForm(baseForm);
        }
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Error al cargar datos para publicar viaje:', error);
        setStatus('error');
      });
  }, [user]);

  const selectedSchedule =
    scheduleOptions.find((option) => option.id === selectedScheduleId) ?? null;
  const seats = profile?.availableSeats ?? 0;

  const setField = <K extends keyof TripForm>(key: K, value: TripForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStepError(null);
  };

  // Cambiar fecha u horarios a mano deja de asociar el viaje a la cursada
  const setScheduleField = (
    key: 'date' | 'departureTime' | 'arrivalTime',
    value: string,
  ) => {
    setField(key, value);
    setSelectedScheduleId(null);
  };

  const handleSelectSchedule = (option: ScheduleOption) => {
    if (option.id === selectedScheduleId) {
      setSelectedScheduleId(null);
      return;
    }
    setForm((prev) => formFromSchedule(prev, option));
    setSelectedScheduleId(option.id);
    setStepError(null);
  };

  const handleBack = () => {
    setStepError(null);
    if (step === 1) {
      navigate(-1);
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleNextFromRoute = () => {
    const error = validateRoute(form);
    if (error) {
      setStepError(error);
      return;
    }
    setStep(2);
  };

  const handlePublish = async () => {
    if (isPublishing) return;

    const error = validateRoute(form);
    if (error) {
      setStep(1);
      setStepError(error);
      return;
    }

    setIsPublishing(true);
    setStepError(null);
    try {
      await createTrip({
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        departureTime: toLocalDate(form.date, form.departureTime).toISOString(),
        arrivalTime: toLocalDate(form.date, form.arrivalTime).toISOString(),
      });
      navigate('/home', { state: { tripPublished: true } });
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : 'No pudimos publicar el viaje.',
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const canPublish = status === 'ready' && Boolean(profile?.hasCar);

  return (
    <div className="publish-trip">
      <header className="publish-trip__header">
        <button
          type="button"
          className="publish-trip__back"
          onClick={handleBack}
          aria-label="Volver"
        >
          <IconBack size={24} color="var(--color-black)" />
        </button>
        <h1 className="text-h5">Publicar viaje</h1>
      </header>

      {canPublish && (
        <ol className="publish-trip__steps">
          {STEPS.map(({ id, label }) => (
            <li
              key={id}
              className={[
                'publish-trip__step',
                id === step && 'publish-trip__step--current',
                id < step && 'publish-trip__step--done',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={id === step ? 'step' : undefined}
            >
              <span className="publish-trip__step-circle">
                {id < step ? (
                  <IconCheck size={14} color="var(--color-primary-600)" />
                ) : (
                  id
                )}
              </span>
              <span className="publish-trip__step-label text-body-3">
                {label}
              </span>
            </li>
          ))}
        </ol>
      )}

      {status === 'loading' && (
        <div className="publish-trip__status">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <p className="publish-trip__status publish-trip__status--error">
          No pudimos cargar tu información. Intentá de nuevo más tarde.
        </p>
      )}

      {status === 'ready' && !profile?.hasCar && (
        <section className="publish-trip__card publish-trip__blocked">
          <span className="publish-trip__blocked-icon">
            <IconCar size={28} color="var(--color-primary-700)" />
          </span>
          <h2 className="text-h6">Necesitás un auto para publicar viajes</h2>
          <p className="publish-trip__muted text-body-3">
            Activá “Con auto” en Mi Perfil y configurá tus asientos disponibles.
          </p>
          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            onClick={() => navigate('/profile')}
          >
            Ir a Mi Perfil
          </Button>
        </section>
      )}

      {canPublish && step === 1 && (
        <>
          {selectedSchedule && (
            <div className="publish-trip__banner text-body-3">
              <IconCalendar size={20} color="var(--color-primary-700)" />
              Pre-completamos estos datos según tu rutina de cursada. Podés
              modificarlos.
            </div>
          )}

          <section className="publish-trip__route">
            <div className="publish-trip__route-row">
              <span className="publish-trip__dot publish-trip__dot--origin" />
              <TextField
                variant="filled"
                label="Desde"
                placeholder="Ej. Av. Corrientes 1234"
                value={form.origin}
                onChange={(e) => setField('origin', e.target.value)}
                leftIcon={
                  <IconMapPin size={18} color="var(--color-primary-600)" />
                }
              />
            </div>
            <div className="publish-trip__route-row">
              <span className="publish-trip__dot publish-trip__dot--destination" />
              <TextField
                variant="filled"
                label="Hasta"
                placeholder="Ej. Universidad Austral – Pilar"
                value={form.destination}
                onChange={(e) => setField('destination', e.target.value)}
                leftIcon={
                  <IconMapPin size={18} color="var(--color-primary-600)" />
                }
              />
            </div>
          </section>

          <section className="publish-trip__field">
            <h2 className="publish-trip__field-title text-body-1-bold">
              <IconCalendar size={20} color="var(--color-primary-700)" />
              Fecha
            </h2>
            <div className="publish-trip__combobox">
              <TextField
                variant="filled"
                aria-label="Fecha del viaje"
                placeholder="Elegí una fecha"
                value={form.date ? formatDateLabel(form.date) : ''}
                readOnly
                role="combobox"
                aria-expanded={isDateOpen}
                onClick={() => setIsDateOpen((open) => !open)}
                onBlur={() => setTimeout(() => setIsDateOpen(false), 150)}
                rightIcon={
                  <IconChevronDown size={20} color="var(--color-grey-400)" />
                }
              />
              {isDateOpen && (
                <ul className="publish-trip__combobox-list" role="listbox">
                  {getDateOptions().map((date) => (
                    <li key={date}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={form.date === date}
                        className="publish-trip__combobox-option text-body-2"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setScheduleField('date', date);
                          setIsDateOpen(false);
                        }}
                      >
                        {formatDateLabel(date)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="publish-trip__times">
            <div className="publish-trip__field">
              <h2 className="publish-trip__field-title text-body-1-bold">
                <IconClock size={20} color="var(--color-primary-700)" />
                Salida
              </h2>
              <TimeField
                value={form.departureTime}
                onChange={(value) => setScheduleField('departureTime', value)}
                ariaLabel="Horario de salida"
              />
            </div>
            <div className="publish-trip__field">
              <h2 className="publish-trip__field-title text-body-1-bold">
                <IconClock size={20} color="var(--color-primary-700)" />
                Llegada
              </h2>
              <TimeField
                value={form.arrivalTime}
                onChange={(value) => setScheduleField('arrivalTime', value)}
                ariaLabel="Horario de llegada"
              />
            </div>
          </section>
          {selectedSchedule && (
            <p className="publish-trip__muted text-body-3">
              Llegada al inicio de tu cursada: {selectedSchedule.subjectName}
              {selectedSchedule.classroom
                ? ` (${selectedSchedule.classroom})`
                : ''}
            </p>
          )}

          <section className="publish-trip__suggestions">
            <h2 className="publish-trip__suggestions-title text-body-3">
              <IconCalendar size={18} color="var(--color-primary-700)" />
              Tus horarios de cursada
            </h2>
            {scheduleOptions.length > 0 ? (
              <div className="publish-trip__chips">
                {scheduleOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={option.id === selectedScheduleId}
                    className={`publish-trip__chip text-body-3${
                      option.id === selectedScheduleId
                        ? ' publish-trip__chip--selected'
                        : ''
                    }`}
                    onClick={() => handleSelectSchedule(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="publish-trip__muted text-body-3">
                No tenés horarios cargados. Podés completar el viaje a mano.
              </p>
            )}
          </section>

          {stepError && (
            <p className="publish-trip__error text-body-3">{stepError}</p>
          )}

          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            onClick={handleNextFromRoute}
          >
            Siguiente
          </Button>
        </>
      )}

      {canPublish && step === 2 && (
        <>
          <div className="publish-trip__heading">
            <h2 className="text-h6">Preferencias del viaje</h2>
            <p className="publish-trip__muted text-body-3">
              Estas preferencias ayudan a encontrar estudiantes compatibles.
            </p>
          </div>

          <section className="publish-trip__card">
            <div className="publish-trip__pref">
              <span className="publish-trip__pref-icon">
                <IconCar size={20} color="var(--color-primary-700)" />
              </span>
              <div className="publish-trip__pref-text">
                <span className="text-body-2-bold">Asientos disponibles</span>
                <span className="publish-trip__muted text-body-3">
                  Ofrecés {formatSeats(seats)}, según tu perfil.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="publish-trip__link text-body-3"
              onClick={() => navigate('/profile')}
            >
              Cambiar en Mi Perfil
            </button>
          </section>

          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            onClick={() => setStep(3)}
          >
            Siguiente
          </Button>
        </>
      )}

      {canPublish && step === 3 && (
        <>
          <div className="publish-trip__heading">
            <h2 className="text-h6">Revisá tu viaje</h2>
            <p className="publish-trip__muted text-body-3">
              Confirmá que la información sea correcta.
            </p>
          </div>

          <section className="publish-trip__card">
            <div className="publish-trip__summary-route">
              <div className="publish-trip__summary-stop">
                <span className="publish-trip__dot publish-trip__dot--origin" />
                <span className="text-body-2-bold">{form.origin}</span>
              </div>
              <div className="publish-trip__summary-stop">
                <span className="publish-trip__dot publish-trip__dot--destination" />
                <span className="text-body-2-bold">{form.destination}</span>
              </div>
            </div>

            <div className="publish-trip__summary-grid">
              <div className="publish-trip__summary-item">
                <IconCalendar size={20} color="var(--color-primary-700)" />
                <div>
                  <span className="text-body-2-bold">Fecha</span>
                  <span className="publish-trip__muted text-body-3">
                    {formatDateLabel(form.date)}
                  </span>
                </div>
              </div>
              <div className="publish-trip__summary-item">
                <IconClock size={20} color="var(--color-primary-700)" />
                <div>
                  <span className="text-body-2-bold">Horario</span>
                  <span className="publish-trip__muted text-body-3">
                    {form.departureTime} → {form.arrivalTime}
                  </span>
                  {selectedSchedule && (
                    <span className="publish-trip__muted text-body-3">
                      (Cursada: {selectedSchedule.subjectName})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="publish-trip__card">
            <h3 className="text-body-1-bold">Preferencias</h3>
            <div className="publish-trip__summary-pref">
              <span className="text-body-3">Asientos disponibles</span>
              <span className="text-body-3">{seats}</span>
            </div>
          </section>

          <div className="publish-trip__banner text-body-3">
            Tu viaje se publicará para que otros estudiantes puedan verlo y
            solicitar unirse.
          </div>

          {stepError && (
            <p className="publish-trip__error text-body-3">{stepError}</p>
          )}

          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={isPublishing}
            onClick={handlePublish}
          >
            {isPublishing ? 'Publicando...' : 'Publicar viaje'}
          </Button>
          <button
            type="button"
            className="publish-trip__link publish-trip__link--center text-body-2"
            onClick={() => setStep(1)}
          >
            Volver y editar
          </button>
        </>
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
