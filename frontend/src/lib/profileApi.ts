import { authFetch } from './api';

export interface ProfileResponse {
  university: string | null;
  career: string | null;
  year: number | null;
  campus: string | null;
  hasCar: boolean | null;
  availableSeats: number | null;
  questionnaireCompleted: boolean;
  carModel: string | null;
  carColor: string | null;
  originAddress: string | null;
  phone: string | null;
  birthDate: string | null;
  bio: string | null;
  detourToleranceKm: number | null;
  photoUrl: string | null;
}

export interface UpsertProfilePayload {
  university?: string;
  career?: string;
  year?: number;
  campus?: string;
  hasCar?: boolean;
  availableSeats?: number;
  questionnaireCompleted?: boolean;
  carModel?: string;
  carColor?: string;
  originAddress?: string;
  phone?: string;
  birthDate?: string;
  bio?: string;
  detourToleranceKm?: number;
}

export async function getProfile(): Promise<ProfileResponse | null> {
  const response = await authFetch('/profile');

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('No pudimos cargar tu perfil');
  }

  return response.json();
}

export async function upsertProfile(
  payload: UpsertProfilePayload,
): Promise<ProfileResponse> {
  const response = await authFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('No pudimos guardar tu perfil');
  }

  return response.json();
}

export async function uploadProfilePhoto(
  photo: Blob,
): Promise<{ photoUrl: string }> {
  const body = new FormData();
  body.append('photo', photo, 'avatar.jpg');

  const response = await authFetch('/profile/photo', { method: 'PUT', body });

  if (!response.ok) {
    throw new Error('No pudimos subir tu foto');
  }

  return response.json();
}
