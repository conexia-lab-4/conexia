import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { ToggleSwitch } from '../../components/toggleswitch';
import { Button } from '../../components/button';
import { Avatar } from '../../components/avatar';
import { CameraCapture } from '../../components/cameraCapture';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconGraduationCap } from '../../assets/icons/IconGraduationCap';
import { IconBook } from '../../assets/icons/IconBook';
import { IconSparkles } from '../../assets/icons/IconSparkles';
import { IconUser } from '../../assets/icons/IconUser';
import { IconCar } from '../../assets/icons/IconCar';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import { IconPencil } from '../../assets/icons/IconPencil';
import { NumberStepper } from '../../components/numberstepper';
import { UNIVERSITIES } from '../questionnaire/universities';
import {
  getProfile,
  upsertProfile,
  uploadProfilePhoto,
  type ProfileResponse,
  type UpsertProfilePayload,
} from '../../lib/profileApi';
import {
  getUniversities,
  getUniversityCampuses,
  type Campus,
  type CatalogUniversity,
} from '../../lib/universitiesApi';
import { getProfileCompletion } from '../../lib/profileCompletion';
import { resizeImage } from '../../lib/resizeImage';
import './index.css';

interface FormState {
  universityId: string | null;
  career: string;
  year: string;
  campusId: string | null;
  originAddress: string;
  phone: string;
  birthDate: string;
  bio: string;
  hasCar: boolean;
  carModel: string;
  carColor: string;
  availableSeats: number;
  detourToleranceKm: string;
}

type LoadStatus = 'loading' | 'ready' | 'error';
type SaveMessage = { type: 'success' | 'error'; text: string } | null;

// En celulares y tablets el input con `capture` abre la cámara nativa; en la
// compu el navegador lo ignora y hay que usar la webcam con getUserMedia
function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

async function detectCamera(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) {
    // Sin la API (p. ej. fuera de https) el input con `capture` igual funciona
    return isTouchDevice();
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some((device) => device.kind === 'videoinput');
  } catch {
    return false;
  }
}

const EMPTY_FORM: FormState = {
  universityId: null,
  career: '',
  year: '',
  campusId: null,
  originAddress: '',
  phone: '',
  birthDate: '',
  bio: '',
  hasCar: false,
  carModel: '',
  carColor: '',
  availableSeats: 0,
  detourToleranceKm: '',
};

const CAR_COLORS = [
  'Blanco',
  'Negro',
  'Gris',
  'Plata',
  'Rojo',
  'Azul',
  'Verde',
  'Beige',
  'Marrón',
  'Amarillo',
  'Naranja',
  'Bordó',
];

function profileToForm(profile: ProfileResponse | null): FormState {
  if (!profile) return EMPTY_FORM;
  return {
    // Perfiles anteriores al catálogo: se reconoce la universidad por su nombre
    universityId:
      profile.universityId ??
      UNIVERSITIES.find((u) => u.name === profile.university)?.id ??
      null,
    career: profile.career ?? '',
    year: profile.year != null ? String(profile.year) : '',
    campusId: profile.campusId,
    originAddress: profile.originAddress ?? '',
    phone: profile.phone ?? '',
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    bio: profile.bio ?? '',
    hasCar: profile.hasCar ?? false,
    carModel: profile.carModel ?? '',
    carColor: profile.carColor ?? '',
    availableSeats: profile.availableSeats ?? 0,
    detourToleranceKm:
      profile.detourToleranceKm != null
        ? String(profile.detourToleranceKm)
        : '',
  };
}

function formToPayload(form: FormState): UpsertProfilePayload {
  const payload: UpsertProfilePayload = { hasCar: form.hasCar };

  if (form.universityId) payload.universityId = form.universityId;
  if (form.career.trim()) payload.career = form.career.trim();
  if (form.year.trim()) payload.year = Number(form.year);
  if (form.campusId) payload.campusId = form.campusId;
  if (form.originAddress.trim()) {
    payload.originAddress = form.originAddress.trim();
  }
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.birthDate) payload.birthDate = form.birthDate;
  if (form.bio.trim()) payload.bio = form.bio.trim();

  if (form.hasCar) {
    payload.availableSeats = form.availableSeats;
    if (form.detourToleranceKm !== '') {
      payload.detourToleranceKm = Number(form.detourToleranceKm);
    }
    if (form.carModel.trim()) payload.carModel = form.carModel.trim();
    if (form.carColor.trim()) payload.carColor = form.carColor.trim();
  }

  return payload;
}

function formatMemberSince(creationTime: string | undefined): string {
  if (!creationTime) return '-';
  const text = new Date(creationTime).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessage>(null);
  const [isColorOpen, setIsColorOpen] = useState(false);
  const [isUniversityOpen, setIsUniversityOpen] = useState(false);
  const [isCampusOpen, setIsCampusOpen] = useState(false);
  const [universities, setUniversities] = useState<CatalogUniversity[]>([]);
  const [loadedCampuses, setLoadedCampuses] = useState<{
    universityId: string;
    items: Campus[];
  } | null>(null);
  const [failedCampusesFor, setFailedCampusesFor] = useState<string | null>(
    null,
  );

  // La foto elegida se sube recién al tocar "Guardar cambios"
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getProfile()
      .then((data) => {
        setProfile(data);
        setForm(profileToForm(data));
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Error al cargar el perfil:', error);
        setStatus('error');
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getUniversities()
      .then(setUniversities)
      .catch((error) => {
        console.error('Error al cargar las universidades:', error);
      });
  }, [user]);

  useEffect(() => {
    const universityId = form.universityId;
    if (!universityId) return;
    let cancelled = false;
    getUniversityCampuses(universityId)
      .then((items) => {
        if (!cancelled) setLoadedCampuses({ universityId, items });
      })
      .catch(() => {
        if (!cancelled) setFailedCampusesFor(universityId);
      });
    return () => {
      cancelled = true;
    };
  }, [form.universityId]);

  // "Tomar foto" solo se ofrece si el dispositivo tiene cámara
  useEffect(() => {
    let active = true;
    const updateCamera = () =>
      detectCamera().then((available) => {
        if (active) setHasCamera(available);
      });

    updateCamera();
    navigator.mediaDevices?.addEventListener?.('devicechange', updateCamera);
    return () => {
      active = false;
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        updateCamera,
      );
    };
  }, []);

  // Con una foto sin guardar, el navegador avisa antes de recargar o cerrar.
  // Los cambios de sección no se pueden frenar: la app usa <BrowserRouter>
  useEffect(() => {
    if (!pendingPhoto) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingPhoto]);

  // Libera la vista previa anterior cuando cambia o se descarta
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectPhoto = (file: File) => {
    setPendingPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSaveMessage(null);
  };

  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Permite volver a elegir la misma foto
    event.target.value = '';
    setIsPhotoMenuOpen(false);
    // Si canceló, queda la foto previa
    if (!file) return;
    selectPhoto(file);
  };

  const handleTakePhoto = () => {
    setIsPhotoMenuOpen(false);
    if (isTouchDevice()) {
      cameraInputRef.current?.click();
    } else {
      setIsCameraOpen(true);
    }
  };

  const handleCameraCapture = (file: File) => {
    setIsCameraOpen(false);
    selectPhoto(file);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
  };

  const handleSelectUniversity = (id: string) => {
    // Si cambia la universidad, la sede anterior ya no corresponde
    setForm((prev) =>
      prev.universityId === id
        ? prev
        : { ...prev, universityId: id, campusId: null },
    );
    setSaveMessage(null);
  };

  const handleToggleCar = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      hasCar: checked,
      // Al activar el auto se arranca con un asiento ofrecido, como en el diseño
      availableSeats:
        checked && prev.availableSeats === 0 ? 1 : prev.availableSeats,
    }));
    setSaveMessage(null);
  };

  const handleIncrementSeats = () =>
    setField('availableSeats', form.availableSeats + 1);

  const handleDecrementSeats = () =>
    setField('availableSeats', Math.max(1, form.availableSeats - 1));

  const handleIncrementDetour = () =>
    setField(
      'detourToleranceKm',
      String((Number(form.detourToleranceKm) || 0) + 1),
    );

  const handleDecrementDetour = () =>
    setField(
      'detourToleranceKm',
      String(Math.max(0, (Number(form.detourToleranceKm) || 0) - 1)),
    );

  const handleSave = async () => {
    if (isSaving) return;

    if (form.hasCar && form.availableSeats < 1) {
      setSaveMessage({
        type: 'error',
        text: 'Seleccioná al menos un asiento para ofrecer.',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const saved = await upsertProfile(formToPayload(form));
      let photoUrl = saved.photoUrl;

      if (pendingPhoto) {
        try {
          ({ photoUrl } = await uploadProfilePhoto(
            await resizeImage(pendingPhoto),
          ));
          setPendingPhoto(null);
          setPreviewUrl(null);
        } catch {
          // Los datos ya se guardaron; la foto queda pendiente para reintentar
          setProfile(saved);
          setForm(profileToForm(saved));
          setSaveMessage({
            type: 'error',
            text: 'Guardamos tus datos, pero no pudimos subir la foto. Intentá de nuevo.',
          });
          return;
        }
      }

      setProfile({ ...saved, photoUrl });
      setForm(profileToForm(saved));
      setSaveMessage({ type: 'success', text: 'Cambios guardados.' });
    } catch {
      setSaveMessage({
        type: 'error',
        text: 'No pudimos guardar tus cambios. Intentá de nuevo.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Solo se muestran las sedes de la universidad elegida
  const campuses =
    loadedCampuses?.universityId === form.universityId
      ? loadedCampuses.items
      : [];
  const campusesFailed = failedCampusesFor === form.universityId;
  const isLoadingCampuses =
    Boolean(form.universityId) &&
    !campusesFailed &&
    loadedCampuses?.universityId !== form.universityId;

  const colorOptions =
    form.carColor && !CAR_COLORS.includes(form.carColor)
      ? [form.carColor, ...CAR_COLORS]
      : CAR_COLORS;

  const completion = getProfileCompletion(profile);
  const universityAbbreviation =
    UNIVERSITIES.find((u) => u.name === profile?.university)?.abbreviation ??
    profile?.university ??
    '-';

  return (
    <div className="profile">
      <header className="profile__header">
        <h1 className="text-h4-bold">Mi Perfil</h1>
        <p className="profile__subtitle text-body-2">
          Completá tu información para mejorar tus matches
        </p>
      </header>

      {status === 'loading' && (
        <div className="profile__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <p className="profile__status profile__status--error">
          No pudimos cargar tu perfil. Intentá de nuevo más tarde.
        </p>
      )}

      {status === 'ready' && (
        <>
          <section className="profile__card profile__summary">
            <div className="profile__summary-top">
              <div className="profile__avatar-wrapper">
                <button
                  type="button"
                  className="profile__avatar-button"
                  aria-label="Cambiar foto de perfil"
                  aria-expanded={isPhotoMenuOpen}
                  onClick={() => setIsPhotoMenuOpen((open) => !open)}
                >
                  <Avatar
                    className="profile__avatar"
                    photoUrl={previewUrl ?? profile?.photoUrl}
                    name={user?.displayName}
                  />
                  <span className="profile__avatar-edit">
                    <IconPencil size={12} color="var(--color-white)" />
                  </span>
                </button>
                {isPhotoMenuOpen && (
                  <div className="profile__photo-menu">
                    {hasCamera && (
                      <button
                        type="button"
                        className="profile__photo-option text-body-3"
                        onClick={handleTakePhoto}
                      >
                        Tomar foto
                      </button>
                    )}
                    <button
                      type="button"
                      className="profile__photo-option text-body-3"
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      Elegir de la galería
                    </button>
                  </div>
                )}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  hidden
                  onChange={handlePhotoSelected}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoSelected}
                />
              </div>
              <div className="profile__identity">
                <span className="profile__name text-body-1-bold">
                  {user?.displayName ?? 'Estudiante'}
                </span>
                <span className="profile__email text-body-3">
                  {user?.email}
                </span>
                {user?.emailVerified && (
                  <span className="profile__verified text-body-3">
                    <IconCheck size={12} color="var(--color-success-700)" />
                    Perfil Verificado
                  </span>
                )}
                {pendingPhoto && (
                  <span className="profile__photo-pending text-body-3">
                    Foto sin guardar · Tocá "Guardar cambios"
                  </span>
                )}
              </div>
              <div className="profile__completion">
                <span className="profile__completion-value">{completion}%</span>
                <span className="profile__completion-label text-body-3">
                  Perfil completo
                </span>
                <div className="profile__completion-track">
                  <div
                    className="profile__completion-fill"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="profile__chips">
              <div className="profile__chip">
                <IconGraduationCap size={20} color="var(--color-primary-700)" />
                <div className="profile__chip-text">
                  <span className="profile__chip-label">Universidad</span>
                  <span className="profile__chip-value">
                    {universityAbbreviation}
                  </span>
                </div>
              </div>
              <div className="profile__chip">
                <IconBook size={20} color="var(--color-primary-700)" />
                <div className="profile__chip-text">
                  <span className="profile__chip-label">Carrera</span>
                  <span className="profile__chip-value">
                    {profile?.career ?? '-'}
                  </span>
                </div>
              </div>
              <div className="profile__chip">
                <IconSparkles size={20} color="var(--color-primary-700)" />
                <div className="profile__chip-text">
                  <span className="profile__chip-label">Miembro desde</span>
                  <span className="profile__chip-value">
                    {formatMemberSince(user?.metadata.creationTime)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="profile__card">
            <div className="profile__card-title">
              <span className="profile__card-icon">
                <IconUser size={20} color="var(--color-primary-700)" />
              </span>
              <h2 className="text-h6">Información personal</h2>
            </div>

            <div className="profile__grid">
              <div className="profile__combobox">
                <TextField
                  variant="filled"
                  label="Universidad"
                  placeholder="Elegí una universidad"
                  value={
                    universities.find((u) => u.id === form.universityId)
                      ?.name ?? ''
                  }
                  readOnly
                  role="combobox"
                  aria-expanded={isUniversityOpen}
                  onClick={() => setIsUniversityOpen((open) => !open)}
                  onBlur={() =>
                    setTimeout(() => setIsUniversityOpen(false), 150)
                  }
                  rightIcon={
                    <IconChevronDown size={20} color="var(--color-grey-400)" />
                  }
                />
                {isUniversityOpen && universities.length > 0 && (
                  <ul className="profile__combobox-list" role="listbox">
                    {universities.map((university) => (
                      <li key={university.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={form.universityId === university.id}
                          className="profile__combobox-option text-body-2"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            handleSelectUniversity(university.id);
                            setIsUniversityOpen(false);
                          }}
                        >
                          {university.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <TextField
                variant="filled"
                label="Carrera"
                placeholder="Ej. Ingeniería en Informática"
                value={form.career}
                onChange={(e) => setField('career', e.target.value)}
              />
              <div className="profile__combobox">
                <TextField
                  variant={campusesFailed ? 'error' : 'filled'}
                  label="Sede / Campus"
                  placeholder={
                    isLoadingCampuses ? 'Cargando sedes...' : 'Elegí una sede'
                  }
                  helperText={
                    campusesFailed ? 'No pudimos cargar las sedes.' : undefined
                  }
                  value={
                    campuses.find((c) => c.id === form.campusId)?.name ?? ''
                  }
                  readOnly
                  role="combobox"
                  aria-expanded={isCampusOpen}
                  onClick={() => setIsCampusOpen((open) => !open)}
                  onBlur={() => setTimeout(() => setIsCampusOpen(false), 150)}
                  rightIcon={
                    <IconChevronDown size={20} color="var(--color-grey-400)" />
                  }
                />
                {isCampusOpen && campuses.length > 0 && (
                  <ul className="profile__combobox-list" role="listbox">
                    {campuses.map((campus) => (
                      <li key={campus.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={form.campusId === campus.id}
                          className="profile__combobox-option text-body-2"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setField('campusId', campus.id);
                            setIsCampusOpen(false);
                          }}
                        >
                          {campus.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <TextField
                variant="filled"
                type="number"
                min={1}
                max={6}
                step={1}
                label="Año de cursada"
                placeholder="Ej. 3"
                value={form.year}
                onChange={(e) => setField('year', e.target.value)}
              />
              <div className="profile__full">
                <TextField
                  variant="filled"
                  label="Dirección de origen"
                  placeholder="Ej. Av. Corrientes 1234"
                  value={form.originAddress}
                  onChange={(e) => setField('originAddress', e.target.value)}
                />
              </div>
              <TextField
                variant="filled"
                type="tel"
                label="Teléfono"
                placeholder="+54 9 11 1234 5678"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
              />
              <TextField
                variant="filled"
                type="date"
                label="Fecha de nacimiento"
                value={form.birthDate}
                onChange={(e) => setField('birthDate', e.target.value)}
              />
              <div className="profile__full">
                <TextField
                  variant="filled"
                  label="Bio"
                  placeholder="Contanos algo sobre vos"
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) => setField('bio', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="profile__card">
            <div className="profile__card-title profile__card-title--between">
              <div className="profile__card-title">
                <span className="profile__card-icon profile__card-icon--green">
                  <IconCar size={20} color="var(--color-success-700)" />
                </span>
                <h2 className="text-h6">Información del auto</h2>
              </div>
              <ToggleSwitch
                label="Con auto"
                checked={form.hasCar}
                onChange={handleToggleCar}
              />
            </div>

            {form.hasCar && (
              <>
                <div className="profile__car-fields">
                  <TextField
                    variant="filled"
                    label="Modelo del auto"
                    placeholder="Ej. VW Polo 2025"
                    value={form.carModel}
                    onChange={(e) => setField('carModel', e.target.value)}
                  />
                  <div className="profile__combobox">
                    <TextField
                      variant="filled"
                      label="Color"
                      placeholder="Elegí un color"
                      value={form.carColor}
                      readOnly
                      role="combobox"
                      aria-expanded={isColorOpen}
                      onClick={() => setIsColorOpen((open) => !open)}
                      onBlur={() =>
                        setTimeout(() => setIsColorOpen(false), 150)
                      }
                      rightIcon={
                        <IconChevronDown
                          size={20}
                          color="var(--color-grey-400)"
                        />
                      }
                    />
                    {isColorOpen && (
                      <ul className="profile__combobox-list" role="listbox">
                        {colorOptions.map((color) => (
                          <li key={color}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={form.carColor === color}
                              className="profile__combobox-option text-body-2"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setField('carColor', color);
                                setIsColorOpen(false);
                              }}
                            >
                              {color}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="profile__car-fields">
                  <TextField
                    variant="filled"
                    label="Asientos disponibles"
                    value={
                      form.availableSeats ? String(form.availableSeats) : ''
                    }
                    onChange={() => {}}
                    readOnly
                    placeholder="Ej. 2"
                    rightIcon={
                      <NumberStepper
                        onIncrement={handleIncrementSeats}
                        onDecrement={handleDecrementSeats}
                        incrementLabel="Aumentar asientos"
                        decrementLabel="Disminuir asientos"
                      />
                    }
                  />
                  <TextField
                    variant="filled"
                    label="Desvío máximo (km)"
                    value={form.detourToleranceKm}
                    onChange={() => {}}
                    readOnly
                    placeholder="Ej. 2"
                    rightIcon={
                      <NumberStepper
                        onIncrement={handleIncrementDetour}
                        onDecrement={handleDecrementDetour}
                        incrementLabel="Aumentar tolerancia de desvío"
                        decrementLabel="Disminuir tolerancia de desvío"
                      />
                    }
                  />
                </div>
              </>
            )}
          </section>

          {saveMessage && (
            <p
              className={`profile__message profile__message--${saveMessage.type} text-body-3`}
            >
              {saveMessage.text}
            </p>
          )}

          <Button
            type="button"
            variant="fulfilled"
            size="large-wide"
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </>
      )}

      <button type="button" className="profile__logout" onClick={logout}>
        Cerrar sesión
      </button>

      {isCameraOpen && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setIsCameraOpen(false)}
        />
      )}

      <NavBar activeItem="perfil" />
    </div>
  );
}
