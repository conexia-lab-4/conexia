import type { RoundTripWithMatches } from './roundTripsApi';

// Con los dos tramos confirmados ya no hay nada pendiente en el paquete: los
// viajes quedan separados en "Próximos viajes" y se oculta la tarjeta
export function isFullyConfirmed(roundTrip: RoundTripWithMatches): boolean {
  return (
    roundTrip.legs.length === 2 &&
    roundTrip.legs.every((leg) => leg.status === 'CONFIRMED')
  );
}
