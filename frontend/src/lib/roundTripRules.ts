import type {
  LegMatchStatus,
  RoundTripKind,
  RoundTripLeg,
  RoundTripWithMatches,
} from './roundTripsApi';

// Mismo margen que el backend para eliminar un viaje con pasajeros
const DELETE_NOTICE_MS = 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<LegMatchStatus, string> = {
  CONFIRMED: 'Confirmado',
  PROPOSED: 'Con propuesta',
  PENDING: 'Buscando coincidencias',
  CLOSED: 'Cerrado',
};

export const PENDING_SCORE_LABEL = 'Pendiente';

export type CancelCheck =
  { allowed: true } | { allowed: false; reason: string };

// Un tramo es un viaje o una intención: el id que se usa para operarlo
export function getLegId(leg: RoundTripLeg): string {
  return leg.tripId ?? leg.travelIntentId ?? '';
}

export function getLegLabel(leg: RoundTripLeg): string {
  if (leg.routeDirection === 'TO_CAMPUS') return 'Ida';
  if (leg.routeDirection === 'FROM_CAMPUS') return 'Vuelta';
  return 'Tramo';
}

export function getLegStatusLabel(leg: RoundTripLeg): string {
  return STATUS_LABEL[leg.status];
}

// Sin coincidencia no hay puntaje: se muestra pendiente, nunca un 0%
export function getLegScoreLabel(leg: RoundTripLeg): string {
  return leg.match ? `${Math.round(leg.match.score)}%` : PENDING_SCORE_LABEL;
}

// El porcentaje del paquete lo calcula el backend; null si falta un tramo
export function getJointScoreLabel(roundTrip: RoundTripWithMatches): string {
  return roundTrip.jointScore === null
    ? PENDING_SCORE_LABEL
    : `${Math.round(roundTrip.jointScore)}%`;
}

// Solo quien publicó intenciones acepta: el conductor ve las propuestas
export function canAcceptLeg(kind: RoundTripKind, leg: RoundTripLeg): boolean {
  return (
    kind === 'INTENT' &&
    leg.status === 'PROPOSED' &&
    leg.match?.status === 'SUGGESTED'
  );
}

// Anticipa las reglas del backend para no ofrecer acciones que va a rechazar.
// El backend sigue teniendo la última palabra
export function checkCancelLeg(
  leg: RoundTripLeg,
  now = new Date(),
): CancelCheck {
  if (leg.tripId) {
    const hasPassengers = (leg.confirmedPassengers ?? 0) > 0;
    const msToDeparture = new Date(leg.departureTime).getTime() - now.getTime();
    if (hasPassengers && msToDeparture < DELETE_NOTICE_MS) {
      return {
        allowed: false,
        reason:
          'Con pasajeros, el viaje solo se puede eliminar hasta 24 horas antes de la salida.',
      };
    }
    return { allowed: true };
  }

  if (leg.status === 'CONFIRMED') {
    return {
      allowed: false,
      reason:
        'Ya te sumaste a un viaje con esta intención, así que no se puede eliminar.',
    };
  }
  if (leg.status === 'CLOSED') {
    return {
      allowed: false,
      reason: 'Esta intención ya no está activa.',
    };
  }
  return { allowed: true };
}

// Los tramos de un paquete se muestran agrupados en su tarjeta: las listas de
// viajes e intenciones simples los dejan afuera para no repetirlos
export function withoutRoundTripLegs<T extends { roundTripId: string | null }>(
  items: T[],
): T[] {
  return items.filter((item) => item.roundTripId === null);
}
