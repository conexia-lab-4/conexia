import { authFetch } from './api';

export interface ProfileResponse {
  university: string | null;
  career: string | null;
  year: number | null;
  campus: string | null;
  hasCar: boolean | null;
  availableSeats: number | null;
  questionnaireCompleted: boolean;
}

export interface UpsertProfilePayload {
  university?: string;
  career?: string;
  year?: number;
  campus?: string;
  hasCar?: boolean;
  availableSeats?: number;
  questionnaireCompleted?: boolean;
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
