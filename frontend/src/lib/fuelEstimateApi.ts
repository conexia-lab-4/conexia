import { authFetch } from './api';
import { getErrorMessage, type RouteDirection } from './tripsApi';

export type FuelUnavailableReason =
  'INVALID_CONSUMPTION' | 'NO_ROUTE' | 'PRICE_UNAVAILABLE';

interface LegBase {
  tripId: string;
  routeDirection: RouteDirection | null;
}

// Respuesta de GET /trips/:id/fuel-estimate y de cada tramo de un paquete
export type LegFuelEstimate =
  | (LegBase & {
      available: true;
      distanceKm: number;
      consumptionLPer100Km: number;
      pricePerLiterArs: number;
      liters: number;
      costArs: number;
    })
  | (LegBase & {
      available: false;
      reason: FuelUnavailableReason;
      distanceKm: number | null;
    });

// Respuesta de GET /round-trips/:id/fuel-estimate. total es null si algún
// tramo no tiene estimación: nunca es una suma parcial
export interface RoundTripFuelEstimate {
  roundTripId: string;
  legs: LegFuelEstimate[];
  total: { liters: number; costArs: number } | null;
}

export async function getTripFuelEstimate(
  tripId: string,
): Promise<LegFuelEstimate> {
  const response = await authFetch(
    `/trips/${encodeURIComponent(tripId)}/fuel-estimate`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos estimar el combustible'),
    );
  }

  return response.json();
}

export async function getRoundTripFuelEstimate(
  roundTripId: string,
): Promise<RoundTripFuelEstimate> {
  const response = await authFetch(
    `/round-trips/${encodeURIComponent(roundTripId)}/fuel-estimate`,
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos estimar el combustible'),
    );
  }

  return response.json();
}
