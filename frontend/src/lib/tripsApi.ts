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

export interface TripUser {
  id: string;
  email: string;
}

export interface TripPassenger {
  id: string;
  tripId: string;
  userId: string;
  createdAt: string;
  user: TripUser;
}

export interface TripDetail extends Trip {
  driver: TripUser;
  passengers: TripPassenger[];
  availableSeats: number;
  isDriver: boolean;
  isParticipant: boolean;
}

export interface CreateTripPayload {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

// El backend devuelve message como string o, en errores de validación, como array
async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  const message = Array.isArray(body?.message)
    ? body.message[0]
    : body?.message;
  return message ?? fallback;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await authFetch('/trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos publicar el viaje'),
    );
  }

  return response.json();
}

export async function getUpcomingTrips(): Promise<TripDetail[]> {
  const response = await authFetch('/trips');

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos cargar los viajes'),
    );
  }

  return response.json();
}

export async function getTrip(id: string): Promise<TripDetail> {
  const response = await authFetch(`/trips/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos cargar el viaje'),
    );
  }

  return response.json();
}

export async function joinTrip(id: string): Promise<void> {
  const response = await authFetch(
    `/trips/${encodeURIComponent(id)}/passengers`,
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos sumarte al viaje'),
    );
  }
}

// Responde 204 sin body: no se parsea la respuesta
export async function leaveTrip(id: string): Promise<void> {
  const response = await authFetch(
    `/trips/${encodeURIComponent(id)}/passengers`,
    { method: 'DELETE' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos sacarte del viaje'),
    );
  }
}
