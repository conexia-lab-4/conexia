import type {
  CreateRoundTripPayload,
  RoundTripKind,
} from '../../lib/roundTripsApi';
import type { CreateTripPayload, RouteDirection } from '../../lib/tripsApi';
import { toLocalDate } from './tripDates';

// Horarios de la vuelta: la sede y la casa son las mismas que en la ida
export interface ReturnLegForm {
  date: string;
  departureTime: string;
  arrivalTime: string;
}

// Mismas reglas que valida el backend, para mostrar el error en el formulario
export function validateReturnLeg(
  direction: RouteDirection,
  outbound: { date: string; arrivalTime: string },
  returnLeg: ReturnLegForm,
): string | null {
  if (direction !== 'TO_CAMPUS') {
    return 'La vuelta solo se puede agregar a un viaje de ida a la universidad.';
  }
  if (!returnLeg.date) return 'Elegí la fecha de la vuelta.';
  if (!returnLeg.departureTime) {
    return 'Elegí el horario de salida de la vuelta.';
  }
  if (!returnLeg.arrivalTime) {
    return 'Elegí el horario de llegada de la vuelta.';
  }

  const departure = toLocalDate(returnLeg.date, returnLeg.departureTime);
  const arrival = toLocalDate(returnLeg.date, returnLeg.arrivalTime);
  if (arrival <= departure) {
    return 'El horario de llegada de la vuelta tiene que ser posterior al de salida.';
  }

  const outboundArrival = toLocalDate(outbound.date, outbound.arrivalTime);
  if (departure <= outboundArrival) {
    return 'La vuelta tiene que salir después de la llegada de la ida.';
  }
  return null;
}

export function buildRoundTripPayload(
  outbound: CreateTripPayload,
  kind: RoundTripKind,
  returnLeg: ReturnLegForm,
): CreateRoundTripPayload {
  return {
    ...outbound,
    kind,
    return: {
      departureTime: toLocalDate(
        returnLeg.date,
        returnLeg.departureTime,
      ).toISOString(),
      arrivalTime: toLocalDate(
        returnLeg.date,
        returnLeg.arrivalTime,
      ).toISOString(),
    },
  };
}
