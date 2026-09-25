import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { TextField } from '../../components/textfield';
import { ToggleSwitch } from '../../components/toggleswitch';
import { Button } from '../../components/button';
import ConexiaLoader from '../../components/ConexiaLoader';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconGraduationCap } from '../../assets/icons/IconGraduationCap';
import { IconBook } from '../../assets/icons/IconBook';
import { IconSparkles } from '../../assets/icons/IconSparkles';
import { IconUser } from '../../assets/icons/IconUser';
import { IconCar } from '../../assets/icons/IconCar';
import { UNIVERSITIES } from '../questionnaire/universities';
import {
  getProfile,
  upsertProfile,
  type ProfileResponse,
  type UpsertProfilePayload,
} from '../../lib/profileApi';
import { getProfileCompletion } from '../../lib/profileCompletion';
import './index.css';

interface FormState {
  university: string;
  career: string;
  year: string;
  campus: string;
  originAddress: string;
  phone: string;
  birthDate: string;
  bio: string;
  hasCar: boolean;
  carModel: string;
  carColor: string;
  availableSeats: string;
}

type LoadStatus = 'loading' | 'ready' | 'error';
type SaveMessage = { type: 'success' | 'error'; text: string } | null;

const EMPTY_FORM: FormState = {
  university: '',
  career: '',
  year: '',
  campus: '',
  originAddress: '',
  phone: '',
  birthDate: '',
  bio: '',
  hasCar: false,
  carModel: '',
  carColor: '',
  availableSeats: '',
};

function profileToForm(profile: ProfileResponse | null): FormState {
  if (!profile) return EMPTY_FORM;
  return {
    university: profile.university ?? '',
    career: profile.career ?? '',
    year: profile.year != null ? String(profile.year) : '',
    campus: profile.campus ?? '',
    originAddress: profile.originAddress ?? '',
    phone: profile.phone ?? '',
    birthDate: profile.birthDate ? profile.birthDate.slice(0, 10) : '',
    bio: profile.bio ?? '',
    hasCar: profile.hasCar ?? false,
    carModel: profile.carModel ?? '',
    carColor: profile.carColor ?? '',
    availableSeats:
      profile.availableSeats != null ? String(profile.availableSeats) : '',
  };
}

function formToPayload(form: FormState): UpsertProfilePayload {
  const payload: UpsertProfilePayload = { hasCar: form.hasCar };

  if (form.university.trim()) payload.university = form.university.trim();
  if (form.career.trim()) payload.career = form.career.trim();
  if (form.year.trim()) payload.year = Number(form.year);
  if (form.campus.trim()) payload.campus = form.campus.trim();
  if (form.originAddress.trim()) {
    payload.originAddress = form.originAddress.trim();
  }
  if (form.phone.trim()) payload.phone = form.phone.trim();
  if (form.birthDate) payload.birthDate = form.birthDate;
  if (form.bio.trim()) payload.bio = form.bio.trim();

  if (form.hasCar) {
    payload.availableSeats = Number(form.availableSeats);
    if (form.carModel.trim()) payload.carModel = form.carModel.trim();
    if (form.carColor.trim()) payload.carColor = form.carColor.trim();
  }

  return payload;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
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

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
  };

  const handleSave = async () => {
    if (isSaving) return;

    if (form.hasCar && !form.availableSeats.trim()) {
      setSaveMessage({
        type: 'error',
        text: 'Indicá cuántos asientos podés ofrecer.',
      });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      const saved = await upsertProfile(formToPayload(form));
      setProfile(saved);
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
        <div className="profile__status">
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
              <div className="profile__avatar">
                {getInitials(user?.displayName)}
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
              <TextField
                variant="filled"
                label="Universidad"
                placeholder="Ej. Universidad Austral"
                value={form.university}
                onChange={(e) => setField('university', e.target.value)}
              />
              <TextField
                variant="filled"
                label="Carrera"
                placeholder="Ej. Ingeniería en Informática"
                value={form.career}
                onChange={(e) => setField('career', e.target.value)}
              />
              <TextField
                variant="filled"
                label="Sede / Campus"
                placeholder="Ej. Pilar, Ciudad Universitaria..."
                value={form.campus}
                onChange={(e) => setField('campus', e.target.value)}
              />
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
                label="Tengo auto"
                checked={form.hasCar}
                onChange={(checked) => setField('hasCar', checked)}
              />
            </div>

            {form.hasCar && (
              <div className="profile__grid">
                <TextField
                  variant="filled"
                  label="Modelo"
                  placeholder="Ej. Toyota Etios"
                  value={form.carModel}
                  onChange={(e) => setField('carModel', e.target.value)}
                />
                <TextField
                  variant="filled"
                  label="Color"
                  placeholder="Ej. Gris"
                  value={form.carColor}
                  onChange={(e) => setField('carColor', e.target.value)}
                />
                <TextField
                  variant="filled"
                  type="number"
                  min={1}
                  label="Asientos disponibles"
                  placeholder="Ej. 2"
                  value={form.availableSeats}
                  onChange={(e) => setField('availableSeats', e.target.value)}
                />
              </div>
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

      <NavBar activeItem="perfil" />
    </div>
  );
}
