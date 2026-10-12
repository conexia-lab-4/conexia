import { authFetch } from './api';
import { getErrorMessage } from './tripsApi';

export type TravelIntentStatus =
  'ACTIVE' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export interface TravelIntent {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: TravelIntentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTravelIntentPayload {
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

export async function createTravelIntent(
  payload: CreateTravelIntentPayload,
): Promise<TravelIntent> {
  const response = await authFetch('/travel-intents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        'No pudimos publicar tu intención de viaje',
      ),
    );
  }

  return response.json();
}
