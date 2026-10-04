import { authFetch } from './api';

export interface Trip {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await authFetch('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message;
    throw new Error(message ?? 'No pudimos publicar el viaje');
  }

  return response.json();
}
