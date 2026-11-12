import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { TimeField } from '../../components/timefield';
import { Button } from '../../components/button';
import {
  TripTypeSelector,
  type TripType,
} from '../../components/triptypeselector';
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
import { createTrip, type RouteDirection } from '../../lib/tripsApi';
import { createTravelIntent } from '../../lib/travelIntentsApi';
import { getUniversityCampuses, type Campus } from '../../lib/universitiesApi';
import { UNIVERSITIES } from '../questionnaire/universities';
import { IconArrowsDownUp } from '../../assets/icons/IconArrowsDownUp';
import {
  formatDateLabel,
  getDateOptions,
  getScheduleOptions,
  nextOccurrence,
  suggestDepartureTime,
  suggestReturnArrivalTime,
  toLocalDate,
  type ScheduleOption,
} from './tripDates';
import { validateReturnLeg, type ReturnLegForm } from './roundTripPayload';
import { ChoiceCards } from '../../components/choicecards';
import { IconArrowsLeftRight } from '../../assets/icons/IconArrowsLeftRight';
import { IconSliders } from '../../assets/icons/IconSliders';
import { LegPreferences } from './legPreferences';
import { describeTravelTime } from './travelTime';
import { IconInfo } from '../../assets/icons/IconInfo';
import { PreferencesSummary } from './preferencesSummary';
import { TripSummaryCard } from './tripSummaryCard';
import {
  defaultLegPreferences,
  validateLegPreferences,
  type LegPreferencesValue,
} from './legPreferencesModel';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';
type Step = 1 | 2 | 3;
type PublishMode = 'trip' | 'intent';
type PreferenceScope = 'BOTH' | 'PER_LEG';

interface PublishTripProps {
  mode?: PublishMode;
}

interface TripForm {
  // Dirección de la casa; el otro extremo es siempre la sede
  home: string;
  direction: RouteDirection;
  campusId: string | null;
  date: string;
  departureTime: string;
  arrivalTime: string;
}

const EMPTY_FORM: TripForm = {
  home: '',
  direction: 'TO_CAMPUS',
  campusId: null,
  date: '',
  departureTime: '',
  arrivalTime: '',
};

const EMPTY_RETURN: ReturnLegForm = {
  date: '',
  departureTime: '',
  arrivalTime: '',
};

const TRIP_STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Ruta y horario' },
  { id: 2, label: 'Preferencias' },
  { id: 3, label: 'Revisar' },
];

// La intención no tiene preferencias: se saltea el paso 2
const INTENT_STEPS: { id: Step; label: string }[] = [
  { id: 1, label: 'Ruta y horario' },
  { id: 3, label: 'Revisar' },
];

const NO_UNIVERSITY_MESSAGE = 'Completá tu universidad en Mi Perfil.';

// Perfiles anteriores al catálogo: se reconoce la universidad por su nombre
function getProfileUniversityId(profile: ProfileResponse | null) {
  return (
    profile?.universityId ??
    UNIVERSITIES.find((u) => u.name === profile?.university)?.id ??
    null
  );
}

function getCampusLabel(universityName: string | null, campus: Campus) {
  return [universityName, campus.name].filter(Boolean).join(' – ');
}

function formFromSchedule(form: TripForm, option: ScheduleOption): TripForm {
  // Al regreso, la salida es al terminar la clase
  if (form.direction === 'FROM_CAMPUS') {
    return {
      ...form,
      date: nextOccurrence(option.dayOfWeek, option.endTime),
      departureTime: option.endTime,
      arrivalTime: suggestReturnArrivalTime(option.endTime),
    };
  }
  return {
    ...form,
    date: nextOccurrence(option.dayOfWeek, option.startTime),
    departureTime: suggestDepartureTime(option.startTime),
    arrivalTime: option.startTime,
  };
}

// La vuelta sale el mismo día; con una clase elegida, sale al terminarla
function returnLegFromSchedule(
  date: string,
  option: ScheduleOption | null,
): ReturnLegForm {
  if (!option) return { ...EMPTY_RETURN, date };
  const leg = formFromSchedule(
    { ...EMPTY_FORM, direction: 'FROM_CAMPUS' },
    option,
  );
  return {
    date,
    departureTime: leg.departureTime,
    arrivalTime: leg.arrivalTime,
  };
}

function validateRoute(form: TripForm, hasUniversity: boolean): string | null {
  if (!hasUniversity) return NO_UNIVERSITY_MESSAGE;
  if (!form.home.trim()) {
    return form.direction === 'TO_CAMPUS'
      ? 'Ingresá desde dónde salís.'
      : 'Ingresá hacia dónde vas.';
  }
  if (!form.campusId) return 'Elegí tu sede.';
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

export function PublishTrip({ mode = 'trip' }: PublishTripProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isIntent = mode === 'intent';
  const steps = isIntent ? INTENT_STEPS : TRIP_STEPS;
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOption[]>([]);
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<TripForm>(EMPTY_FORM);
  const [tripType, setTripType] = useState<TripType>('ONE_WAY');
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [returnLeg, setReturnLeg] = useState<ReturnLegForm>(EMPTY_RETURN);
  const [isReturnDateOpen, setIsReturnDateOpen] = useState(false);
  const [scope, setScope] = useState<PreferenceScope>('BOTH');
  const [bothPrefs, setBothPrefs] = useState<LegPreferencesValue>(
    defaultLegPreferences(null),
  );
  const [outboundPrefs, setOutboundPrefs] = useState<LegPreferencesValue>(
    defaultLegPreferences(null),
  );
  const [returnPrefs, setReturnPrefs] = useState<LegPreferencesValue>(
    defaultLegPreferences(null),
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isCampusOpen, setIsCampusOpen] = useState(false);
  const [campusesFailed, setCampusesFailed] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getProfile(),
      // Los horarios son opcionales: si fallan, el viaje se carga a mano
      getSubjects().catch(() => []),
    ])
      .then(async ([profileData, subjects]) => {
        const options = getScheduleOptions(subjects);
        const universityId = getProfileUniversityId(profileData);
        let campusLoadFailed = false;
        const campusOptions = universityId
          ? await getUniversityCampuses(universityId).catch((error) => {
              console.error('Error al cargar las sedes:', error);
              campusLoadFailed = true;
              return [] as Campus[];
            })
          : [];
        const baseForm: TripForm = {
          ...EMPTY_FORM,
          home: profileData?.originAddress ?? '',
          // La sede del perfil queda como predeterminada
          campusId:
            campusOptions.find((campus) => campus.id === profileData?.campusId)
              ?.id ?? null,
        };
        setProfile(profileData);
        const defaults = defaultLegPreferences(profileData);
        setBothPrefs(defaults);
        setOutboundPrefs(defaults);
        setReturnPrefs(defaults);
        setCampuses(campusOptions);
        setCampusesFailed(campusLoadFailed);
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
  const hasUniversity = Boolean(getProfileUniversityId(profile));
  const universityName = profile?.university ?? null;
  const selectedCampus = campuses.find((campus) => campus.id === form.campusId);
  const campusLabel = selectedCampus
    ? getCampusLabel(universityName, selectedCampus)
    : '';
  const toCampus = form.direction === 'TO_CAMPUS';
  const origin = toCampus ? form.home.trim() : campusLabel;
  const destination = toCampus ? campusLabel : form.home.trim();
  const outboundTravel = describeTravelTime(
    form.date,
    form.departureTime,
    form.arrivalTime,
  );
  const returnTravel =
    tripType === 'ROUND_TRIP'
      ? describeTravelTime(
          returnLeg.date,
          returnLeg.departureTime,
          returnLeg.arrivalTime,
        )
      : undefined;
  const toTravelLabel = (time?: string) =>
    time ? `Tiempo de viaje: ${time}` : undefined;
  const bothTravelLabel =
    outboundTravel && returnTravel
      ? `Ida: ${outboundTravel} · Vuelta: ${returnTravel}`
      : toTravelLabel(outboundTravel);
  const campusStop = {
    title: universityName ?? 'Universidad',
    detail: selectedCampus?.name ?? '',
  };
  const homeStop = { title: 'Casa', detail: form.home.trim() };
  const outboundStops = toCampus
    ? { origin: homeStop, destination: campusStop }
    : { origin: campusStop, destination: homeStop };
  const isRoundTrip = tripType === 'ROUND_TRIP';
  const isPerLeg = isRoundTrip && scope === 'PER_LEG';

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

  const setReturnField = (key: keyof ReturnLegForm, value: string) => {
    setReturnLeg((prev) => ({ ...prev, [key]: value }));
    setStepError(null);
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    // Sin vuelta no queda ningún dato de la vuelta guardado
    setReturnLeg(
      type === 'ROUND_TRIP'
        ? returnLegFromSchedule(form.date, selectedSchedule)
        : EMPTY_RETURN,
    );
    setStepError(null);
  };

  const handleSwapDirection = () => {
    const direction: RouteDirection =
      form.direction === 'TO_CAMPUS' ? 'FROM_CAMPUS' : 'TO_CAMPUS';
    const next = { ...form, direction };
    // Si hay una clase elegida, los horarios se recalculan para el nuevo sentido
    setForm(selectedSchedule ? formFromSchedule(next, selectedSchedule) : next);
    // La vuelta solo se ofrece cuando la ida va hacia la sede
    if (direction === 'FROM_CAMPUS') handleTripTypeChange('ONE_WAY');
    setStepError(null);
  };

  const handleSelectSchedule = (option: ScheduleOption) => {
    if (option.id === selectedScheduleId) {
      setSelectedScheduleId(null);
      return;
    }
    const next = formFromSchedule(form, option);
    setForm(next);
    if (tripType === 'ROUND_TRIP') {
      setReturnLeg(returnLegFromSchedule(next.date, option));
    }
    setSelectedScheduleId(option.id);
    setStepError(null);
  };

  const handleBack = () => {
    setStepError(null);
    if (step === 1) {
      navigate(-1);
    } else if (isIntent) {
      setStep(1);
    } else {
      setStep((prev) => (prev - 1) as Step);
    }
  };

  const handleNextFromRoute = () => {
    const error =
      validateRoute(form, hasUniversity) ??
      (tripType === 'ROUND_TRIP'
        ? validateReturnLeg(form.direction, form, returnLeg)
        : null);
    if (error) {
      setStepError(error);
      return;
    }
    setStep(isIntent ? 3 : 2);
  };

  const handleScopeChange = (next: PreferenceScope) => {
    // Al personalizar por tramo, los dos tramos arrancan con los valores actuales
    if (next === 'PER_LEG' && scope === 'BOTH') {
      setOutboundPrefs(bothPrefs);
      setReturnPrefs(bothPrefs);
    }
    setScope(next);
    setStepError(null);
  };

  const handleNextFromPreferences = () => {
    const error =
      tripType === 'ROUND_TRIP' && scope === 'PER_LEG'
        ? (validateLegPreferences(outboundPrefs) ??
          validateLegPreferences(returnPrefs))
        : validateLegPreferences(bothPrefs);
    if (error) {
      setStepError(error);
      return;
    }
    setStep(3);
  };

  const handlePublish = async () => {
    if (isPublishing) return;

    const error = validateRoute(form, hasUniversity);
    const campusId = form.campusId;
    if (error || !campusId) {
      setStep(1);
      setStepError(error ?? 'Elegí tu sede.');
      return;
    }

    const payload = {
      origin,
      destination,
      campusId,
      routeDirection: form.direction,
      departureTime: toLocalDate(form.date, form.departureTime).toISOString(),
      arrivalTime: toLocalDate(form.date, form.arrivalTime).toISOString(),
    };

    setIsPublishing(true);
    setStepError(null);
    try {
      if (isIntent) {
        await createTravelIntent(payload);
        navigate('/trips', { state: { intentCreated: true } });
      } else {
        await createTrip(payload);
        navigate('/home', { state: { tripPublished: true } });
      }
    } catch (err) {
      // Si una dirección no se reconoce, se corrige en el paso 1:
      // el form queda en el state, así que no se pierden los datos
      if (isIntent) setStep(1);
      setStepError(
        err instanceof Error
          ? err.message
          : isIntent
            ? 'No pudimos publicar tu intención de viaje.'
            : 'No pudimos publicar el viaje.',
      );
    } finally {
      setIsPublishing(false);
    }
  };

  const renderHomeField = (label: string) => (
    <TextField
      variant="filled"
      label={label}
      placeholder="Ej. Av. Corrientes 1234"
      value={form.home}
      onChange={(e) => setField('home', e.target.value)}
      leftIcon={<IconMapPin size={20} color="var(--color-primary-500)" />}
    />
  );

  // Sin sedes la lista no se abre: el campo explica por qué
  const campusHelperText = !hasUniversity
    ? NO_UNIVERSITY_MESSAGE
    : campusesFailed
      ? 'No pudimos cargar las sedes.'
      : campuses.length === 0
        ? 'Tu universidad todavía no tiene sedes disponibles.'
        : selectedCampus?.address;

  // La universidad es la del perfil: solo se elige entre sus sedes
  const renderCampusField = (label: string) => (
    <div className="publish-trip__combobox">
      <TextField
        variant={campusesFailed ? 'error' : 'filled'}
        label={label}
        placeholder="Elegí una sede"
        helperText={campusHelperText}
        value={campusLabel}
        readOnly
        role="combobox"
        aria-expanded={isCampusOpen && campuses.length > 0}
        onClick={() => setIsCampusOpen((open) => !open)}
        onBlur={() => setTimeout(() => setIsCampusOpen(false), 150)}
        leftIcon={<IconMapPin size={20} color="var(--color-primary-500)" />}
        rightIcon={<IconChevronDown size={20} color="var(--color-grey-400)" />}
      />
      {isCampusOpen && campuses.length > 0 && (
        <ul className="publish-trip__combobox-list" role="listbox">
          {campuses.map((campus) => (
            <li key={campus.id}>
              <button
                type="button"
                role="option"
                aria-selected={form.campusId === campus.id}
                className="publish-trip__combobox-option text-body-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setField('campusId', campus.id);
                  setIsCampusOpen(false);
                }}
              >
                {getCampusLabel(universityName, campus)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderDateField = (
    ariaLabel: string,
    date: string,
    isOpen: boolean,
    setOpen: (open: boolean) => void,
    onPick: (date: string) => void,
  ) => (
    <div className="publish-trip__combobox">
      <TextField
        variant="filled"
        aria-label={ariaLabel}
        placeholder="Elegí una fecha"
        value={date ? formatDateLabel(date) : ''}
        readOnly
        role="combobox"
        aria-expanded={isOpen}
        onClick={() => setOpen(!isOpen)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        leftIcon={<IconCalendar size={20} color="var(--color-primary-800)" />}
        rightIcon={<IconChevronDown size={20} color="var(--color-grey-400)" />}
      />
      {isOpen && (
        <ul className="publish-trip__combobox-list" role="listbox">
          {getDateOptions().map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={date === option}
                className="publish-trip__combobox-option text-body-2"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(option);
                  setOpen(false);
                }}
              >
                {formatDateLabel(option)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const canPublish =
    status === 'ready' && (isIntent || Boolean(profile?.hasCar));

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
        <h1 className="text-h5">
          {isIntent ? 'Necesito un viaje' : 'Publicar viaje'}
        </h1>
      </header>

      {canPublish && (
        <ol className="publish-trip__steps">
          {steps.map(({ id, label }, index) => (
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
                  index + 1
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
        <div className="publish-trip__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <p className="publish-trip__status publish-trip__status--error">
          No pudimos cargar tu información. Intentá de nuevo más tarde.
        </p>
      )}

      {status === 'ready' && !canPublish && (
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
              <IconCalendar size={20} color="var(--color-primary-500)" />
              Pre-completamos estos datos según tu rutina de cursada. Podés
              modificarlos.
            </div>
          )}

          <TripTypeSelector
            value={tripType}
            onChange={handleTripTypeChange}
            roundTripDisabled={!toCampus}
            disabledNote="La vuelta solo se ofrece si tu viaje va hacia la sede."
          />

          {tripType === 'ROUND_TRIP' && (
            <span className="publish-trip__leg-pill text-body-2-bold">Ida</span>
          )}

          <section className="publish-trip__route">
            <div className="publish-trip__route-row">
              <span className="publish-trip__dot publish-trip__dot--origin" />
              {toCampus ? renderHomeField('Desde') : renderCampusField('Desde')}
            </div>
            <div className="publish-trip__route-row">
              <span className="publish-trip__dot publish-trip__dot--destination" />
              {toCampus ? renderCampusField('Hasta') : renderHomeField('Hasta')}
            </div>
            <button
              type="button"
              className="publish-trip__swap"
              onClick={handleSwapDirection}
              aria-label="Invertir recorrido"
            >
              <IconArrowsDownUp size={20} color="var(--color-primary-700)" />
            </button>
          </section>

          <section className="publish-trip__field">
            <h2 className="publish-trip__field-title text-body-1-bold">
              <IconCalendar size={20} color="var(--color-primary-700)" />
              {tripType === 'ROUND_TRIP' ? 'Fecha de ida' : 'Fecha'}
            </h2>
            {renderDateField(
              'Fecha del viaje',
              form.date,
              isDateOpen,
              setIsDateOpen,
              (date) => setScheduleField('date', date),
            )}
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
              {toCampus
                ? 'Llegada al inicio de tu cursada'
                : 'Salida al finalizar tu cursada'}
              : {selectedSchedule.subjectName}{' '}
              {selectedSchedule.classroom
                ? ` (${selectedSchedule.classroom})`
                : ''}
            </p>
          )}

          <section className="publish-trip__schedule">
            <button
              type="button"
              className="publish-trip__schedule-toggle text-body-2-bold"
              aria-expanded={isScheduleOpen}
              onClick={() => setIsScheduleOpen((open) => !open)}
            >
              <IconCalendar size={20} color="var(--color-primary-800)" />
              Tus horarios de cursada
              <IconChevronDown size={20} color="var(--color-grey-400)" />
            </button>
            {isScheduleOpen &&
              (scheduleOptions.length > 0 ? (
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
              ))}
          </section>

          {tripType === 'ROUND_TRIP' && (
            <>
              <span className="publish-trip__leg-pill text-body-2-bold">
                Vuelta
              </span>

              <section className="publish-trip__route">
                <div className="publish-trip__route-row">
                  <span className="publish-trip__dot publish-trip__dot--origin" />
                  <TextField
                    variant="filled"
                    label="Desde"
                    value={campusLabel}
                    readOnly
                    leftIcon={
                      <IconMapPin size={20} color="var(--color-primary-500)" />
                    }
                  />
                </div>
                <div className="publish-trip__route-row">
                  <span className="publish-trip__dot publish-trip__dot--destination" />
                  <TextField
                    variant="filled"
                    label="Hasta"
                    value={form.home}
                    readOnly
                    leftIcon={
                      <IconMapPin size={20} color="var(--color-primary-500)" />
                    }
                  />
                </div>
              </section>

              <section className="publish-trip__field">
                <h2 className="publish-trip__field-title text-body-1-bold">
                  <IconCalendar size={20} color="var(--color-primary-700)" />
                  Fecha de vuelta
                </h2>
                {renderDateField(
                  'Fecha de la vuelta',
                  returnLeg.date,
                  isReturnDateOpen,
                  setIsReturnDateOpen,
                  (date) => setReturnField('date', date),
                )}
              </section>

              <section className="publish-trip__times">
                <div className="publish-trip__field">
                  <h2 className="publish-trip__field-title text-body-1-bold">
                    <IconClock size={20} color="var(--color-primary-700)" />
                    Salida
                  </h2>
                  <TimeField
                    value={returnLeg.departureTime}
                    onChange={(value) => setReturnField('departureTime', value)}
                    ariaLabel="Horario de salida de la vuelta"
                  />
                </div>
                <div className="publish-trip__field">
                  <h2 className="publish-trip__field-title text-body-1-bold">
                    <IconClock size={20} color="var(--color-primary-700)" />
                    Llegada
                  </h2>
                  <TimeField
                    value={returnLeg.arrivalTime}
                    onChange={(value) => setReturnField('arrivalTime', value)}
                    ariaLabel="Horario de llegada de la vuelta"
                  />
                </div>
              </section>
            </>
          )}

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

      {canPublish && !isIntent && step === 2 && (
        <>
          <div className="publish-trip__heading">
            <h2 className="text-h6">Preferencias del viaje</h2>
            <p className="publish-trip__muted text-body-3">
              Estas preferencias ayudan a encontrar estudiantes compatibles.
            </p>
          </div>

          {tripType === 'ROUND_TRIP' && (
            <ChoiceCards
              title="Personalizar preferencias"
              value={scope}
              onChange={handleScopeChange}
              options={[
                {
                  value: 'BOTH',
                  label: 'Ambos viajes',
                  icon: (
                    <IconArrowsLeftRight
                      size={20}
                      color="var(--color-primary-700)"
                    />
                  ),
                },
                {
                  value: 'PER_LEG',
                  label: 'Por tramo',
                  icon: (
                    <IconSliders size={20} color="var(--color-primary-700)" />
                  ),
                },
              ]}
            />
          )}

          {tripType === 'ROUND_TRIP' && scope === 'PER_LEG' ? (
            <>
              <span className="publish-trip__leg-pill text-body-2-bold">
                Ida
              </span>
              <LegPreferences
                value={outboundPrefs}
                travelLabel={toTravelLabel(outboundTravel)}
                onChange={(next) => {
                  setOutboundPrefs(next);
                  setStepError(null);
                }}
              />
              <span className="publish-trip__leg-pill text-body-2-bold">
                Vuelta
              </span>
              <LegPreferences
                value={returnPrefs}
                travelLabel={toTravelLabel(returnTravel)}
                onChange={(next) => {
                  setReturnPrefs(next);
                  setStepError(null);
                }}
              />
            </>
          ) : (
            <LegPreferences
              value={bothPrefs}
              travelLabel={bothTravelLabel}
              onChange={(next) => {
                setBothPrefs(next);
                setStepError(null);
              }}
            />
          )}

          {stepError && (
            <p className="publish-trip__error text-body-3">{stepError}</p>
          )}

          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            onClick={handleNextFromPreferences}
          >
            Siguiente
          </Button>
        </>
      )}

      {canPublish && step === 3 && (
        <>
          <div className="publish-trip__heading">
            <h2 className="text-h6">
              {isIntent ? 'Revisá tu intención de viaje' : 'Revisá tu viaje'}
            </h2>
            <p className="publish-trip__muted text-body-3">
              Confirmá que la información sea correcta.
            </p>
          </div>

          {isRoundTrip && (
            <span className="publish-trip__leg-pill text-body-2-bold">Ida</span>
          )}
          <TripSummaryCard
            origin={outboundStops.origin}
            destination={outboundStops.destination}
            date={form.date}
            departureTime={form.departureTime}
            arrivalTime={form.arrivalTime}
            note={
              selectedSchedule
                ? `(Cursada: ${selectedSchedule.subjectName})`
                : undefined
            }
          />
          {!isIntent && isPerLeg && (
            <PreferencesSummary value={outboundPrefs} />
          )}

          {isRoundTrip && (
            <>
              <span className="publish-trip__leg-pill text-body-2-bold">
                Vuelta
              </span>
              <TripSummaryCard
                origin={{ title: campusStop.title, detail: campusStop.detail }}
                destination={homeStop}
                date={returnLeg.date}
                departureTime={returnLeg.departureTime}
                arrivalTime={returnLeg.arrivalTime}
              />
              {!isIntent && isPerLeg && (
                <PreferencesSummary value={returnPrefs} />
              )}
            </>
          )}

          {!isIntent && !isPerLeg && <PreferencesSummary value={bothPrefs} />}

          <div className="publish-trip__banner text-body-3">
            <IconInfo size={20} color="var(--color-primary-600)" />
            {isIntent
              ? isRoundTrip
                ? 'Tus intenciones de ida y de vuelta quedarán activas para que conductores con un recorrido compatible puedan encontrarte.'
                : 'Tu intención quedará activa para que conductores con un recorrido compatible puedan encontrarte.'
              : isRoundTrip
                ? 'Se publicarán tu viaje de ida y tu viaje de vuelta para que otros estudiantes puedan verlos y solicitar unirse.'
                : 'Tu viaje se publicará para que otros estudiantes puedan verlo y solicitar unirse.'}
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
            {isPublishing
              ? 'Publicando...'
              : isIntent
                ? 'Publicar intención'
                : 'Publicar viaje'}
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
