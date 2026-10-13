export const ALGORITHM_VERSION = 'deterministic-v1';
export const MAX_TIME_DELTA_MINUTES = 30;
export const MIN_SCORE = 60;

const DETOUR_WEIGHT = 60;
const DEPARTURE_WEIGHT = 20;
const ARRIVAL_WEIGHT = 20;

export interface ScoreInput {
  detourKm: number;
  detourToleranceKm: number;
  departureDeltaMinutes: number;
  arrivalDeltaMinutes: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 60000;
}

export function isDetourWithinTolerance(
  detourKm: number,
  detourToleranceKm: number,
): boolean {
  return detourKm <= detourToleranceKm;
}

export function isTimeDeltaAllowed(deltaMinutes: number): boolean {
  return deltaMinutes <= MAX_TIME_DELTA_MINUTES;
}

export function computeDetourScore(
  detourKm: number,
  detourToleranceKm: number,
): number {
  // Un desvío negativo (la ruta con pasajero salió más corta) cuenta como 0
  const effectiveDetourKm = Math.max(0, detourKm);

  // Con tolerancia 0 no se puede dividir: solo un desvío de 0 puntúa completo
  if (detourToleranceKm <= 0) {
    return effectiveDetourKm === 0 ? 1 : 0;
  }

  return clamp01(1 - effectiveDetourKm / detourToleranceKm);
}

export function computeTimeScore(deltaMinutes: number): number {
  return clamp01(1 - deltaMinutes / MAX_TIME_DELTA_MINUTES);
}

export function computeScore(input: ScoreInput): number {
  const detourScore = computeDetourScore(
    input.detourKm,
    input.detourToleranceKm,
  );
  const departureScore = computeTimeScore(input.departureDeltaMinutes);
  const arrivalScore = computeTimeScore(input.arrivalDeltaMinutes);

  return (
    DETOUR_WEIGHT * detourScore +
    DEPARTURE_WEIGHT * departureScore +
    ARRIVAL_WEIGHT * arrivalScore
  );
}

export function meetsMinimumScore(score: number): boolean {
  return score >= MIN_SCORE;
}

export const DETOUR_ROUNDING_DECIMALS = 2;

export function normalizeDetourKm(detourKm: number): number {
  const factor = 10 ** DETOUR_ROUNDING_DECIMALS;
  return Math.max(0, Math.round(detourKm * factor) / factor);
}
