import { authFetch } from './api';
import { getErrorMessage } from './tripsApi';
import { getPersonName } from './tripFormat';

// Respuesta de GET /travel-matches
export interface TravelMatch {
  id: string;
  status: string;
  score: number;
  detourKm: number;
  departureDeltaMinutes: number;
  arrivalDeltaMinutes: number;
  trip: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    capacity: number;
    availableSeats: number;
    driver: {
      id: string;
      email: string;
      profile: {
        career: string | null;
        year: number | null;
        campus: string | null;
        carModel: string | null;
        carColor: string | null;
      } | null;
      displayName: string | null;
      photoUrl: string | null;
    };
  };
}

// Lo que necesita la card
export interface Match {
  id: string;
  name: string;
  photoUrl: string | null;
  career: string | null;
  year: number | null;
  campus: string | null;
  availableSeats: number;
  compatibilityPercent: number;
}

export function toMatch(travelMatch: TravelMatch): Match {
  const { driver, availableSeats } = travelMatch.trip;

  return {
    id: travelMatch.id,
    name: getPersonName(driver.displayName),
    photoUrl: driver.photoUrl,
    career: driver.profile?.career ?? null,
    year: driver.profile?.year ?? null,
    campus: driver.profile?.campus ?? null,
    availableSeats,
    compatibilityPercent: Math.round(travelMatch.score),
  };
}

export async function getTravelMatches(): Promise<TravelMatch[]> {
  const response = await authFetch('/travel-matches');

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos cargar tus matches'),
    );
  }

  return response.json();
}

export async function getMatches(): Promise<Match[]> {
  return (await getTravelMatches()).map(toMatch);
}

export async function acceptMatch(id: string): Promise<void> {
  const response = await authFetch(
    `/travel-matches/${encodeURIComponent(id)}/accept`,
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos aceptar el match'),
    );
  }
}

export async function rejectMatch(id: string): Promise<void> {
  const response = await authFetch(
    `/travel-matches/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos rechazar el match'),
    );
  }
}
