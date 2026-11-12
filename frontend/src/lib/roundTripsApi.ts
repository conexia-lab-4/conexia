import { authFetch } from './api';
import {
  getErrorMessage,
  UnavailableError,
  type CreateTripPayload,
} from './tripsApi';

export type RoundTripKind = 'TRIP' | 'INTENT';
export type LegMatchStatus = 'CONFIRMED' | 'PROPOSED' | 'PENDING' | 'CLOSED';

export interface CreateRoundTripPayload extends CreateTripPayload {
  kind: RoundTripKind;
  return: { departureTime: string; arrivalTime: string };
}

export interface RoundTripMatchPerson {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  carModel?: string | null; // solo en paquetes INTENT (la otra persona es conductor)
  carColor?: string | null;
}

export interface RoundTripLeg {
  routeDirection: 'TO_CAMPUS' | 'FROM_CAMPUS' | null;
  tripId: string | null;
  travelIntentId: string | null;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: LegMatchStatus;
  confirmedPassengers?: number;
  match: {
    id: string;
    score: number;
    status: 'SUGGESTED' | 'ACCEPTED';
    tripId: string;
    travelIntentId: string;
    person: RoundTripMatchPerson;
  } | null;
}

export interface RoundTripWithMatches {
  id: string;
  kind: RoundTripKind;
  jointScore: number | null;
  legs: RoundTripLeg[];
}

export async function createRoundTrip(payload: CreateRoundTripPayload) {
  const response = await authFetch('/round-trips', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'No pudimos publicar el viaje de ida y vuelta',
      ),
    );
  }
  return response.json() as Promise<{ id: string; kind: RoundTripKind }>;
}

export async function getRoundTripMatches(
  id: string,
): Promise<RoundTripWithMatches> {
  const response = await authFetch(
    `/round-trips/${encodeURIComponent(id)}/matches`,
  );
  if (response.status === 404)
    throw new UnavailableError(
      'El viaje de ida y vuelta ya no está disponible',
    );
  if (!response.ok)
    throw new Error(
      await getErrorMessage(
        response,
        'No pudimos cargar el viaje de ida y vuelta',
      ),
    );
  return response.json();
}

export async function getMyRoundTrips(): Promise<RoundTripWithMatches[]> {
  const response = await authFetch('/round-trips/matches');
  if (!response.ok)
    throw new Error(
      await getErrorMessage(
        response,
        'No pudimos cargar tus viajes de ida y vuelta',
      ),
    );
  return response.json();
}
