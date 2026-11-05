import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  RouteDirection,
  TravelIntentStatus,
  TravelMatchStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DisplayNamesService } from '../firebase/display-names.service';
import { RoundTripKind } from './dto/create-round-trip.dto';

// CONFIRMED: hay un match aceptado. PROPOSED: hay sugerencias. PENDING: todavía
// no hay coincidencias. CLOSED: el tramo ya no busca (vencido, cancelado o
// salido) y no llegó a confirmarse
export type LegMatchStatus = 'CONFIRMED' | 'PROPOSED' | 'PENDING' | 'CLOSED';

export interface MatchCandidate {
  id: string;
  score: number;
  status: TravelMatchStatus;
  tripId: string;
  travelIntentId: string;
  // Salida del viaje o la intención de la otra persona, para desempatar
  departureTime: Date;
  personId: string;
  car?: { carModel: string | null; carColor: string | null } | null;
}

const OPEN_MATCH = {
  status: { in: [TravelMatchStatus.ACCEPTED, TravelMatchStatus.SUGGESTED] },
};

// El aceptado manda. Si no hay, la mejor sugerencia por puntaje y, a igualdad,
// la que sale antes. No se arman todas las combinaciones posibles
export function pickMatch(candidates: MatchCandidate[]): MatchCandidate | null {
  const accepted = candidates.filter(
    (candidate) => candidate.status === TravelMatchStatus.ACCEPTED,
  );
  const pool =
    accepted.length > 0
      ? accepted
      : candidates.filter(
          (candidate) => candidate.status === TravelMatchStatus.SUGGESTED,
        );

  return (
    [...pool].sort(
      (a, b) =>
        b.score - a.score ||
        a.departureTime.getTime() - b.departureTime.getTime() ||
        a.id.localeCompare(b.id),
    )[0] ?? null
  );
}

// Promedio de los dos tramos, solo si los dos tienen coincidencia. Con un solo
// tramo no hay porcentaje del paquete: no se promedia contra cero
export function jointScore(
  legs: { match: { score: number } | null }[],
): number | null {
  const scores = legs.flatMap((leg) => (leg.match ? [leg.match.score] : []));
  if (legs.length !== 2 || scores.length !== 2) return null;
  return (scores[0] + scores[1]) / 2;
}

interface LegDraft {
  roundTripId: string;
  kind: RoundTripKind;
  routeDirection: RouteDirection | null;
  tripId: string | null;
  travelIntentId: string | null;
  origin: string;
  destination: string;
  departureTime: Date;
  arrivalTime: Date;
  status: LegMatchStatus;
  confirmedPassengers?: number;
  match: MatchCandidate | null;
}

@Injectable()
export class RoundTripMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly displayNames: DisplayNamesService,
  ) {}

  // Las coincidencias de un paquete, agrupadas por tramo
  async findForPackage(id: string, userId: string) {
    const [roundTrip] = await this.load(userId, id);
    if (!roundTrip) {
      throw new NotFoundException('El viaje de ida y vuelta no existe');
    }
    return roundTrip;
  }

  // Los paquetes propios con algún tramo que todavía no terminó
  async findMine(userId: string) {
    const now = new Date();
    const roundTrips = await this.load(userId, { not: null });
    return roundTrips.filter((roundTrip) =>
      roundTrip.legs.some((leg) => leg.arrivalTime > now),
    );
  }

  private async load(
    userId: string,
    roundTripId: string | Prisma.StringNullableFilter,
  ) {
    const now = new Date();
    const orderBy = { departureTime: 'asc' } as const;

    const [trips, intents] = await Promise.all([
      this.prisma.trip.findMany({
        where: { driverId: userId, roundTripId },
        orderBy,
        include: {
          _count: { select: { passengers: true } },
          travelMatches: {
            where: OPEN_MATCH,
            select: {
              id: true,
              score: true,
              status: true,
              tripId: true,
              travelIntentId: true,
              travelIntent: { select: { userId: true, departureTime: true } },
            },
          },
        },
      }),
      this.prisma.travelIntent.findMany({
        where: { userId, roundTripId },
        orderBy,
        include: {
          travelMatches: {
            where: OPEN_MATCH,
            select: {
              id: true,
              score: true,
              status: true,
              tripId: true,
              travelIntentId: true,
              trip: {
                select: {
                  driverId: true,
                  departureTime: true,
                  driver: {
                    select: {
                      studentProfile: {
                        select: { carModel: true, carColor: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    const tripLegs = trips.map((trip): LegDraft => {
      // Quien publica viajes ve a los pasajeros de las intenciones
      const match = pickMatch(
        trip.travelMatches.map((candidate) => ({
          id: candidate.id,
          score: candidate.score,
          status: candidate.status,
          tripId: candidate.tripId,
          travelIntentId: candidate.travelIntentId,
          departureTime: candidate.travelIntent.departureTime,
          personId: candidate.travelIntent.userId,
        })),
      );
      const confirmed = match?.status === TravelMatchStatus.ACCEPTED;
      const closed = !confirmed && trip.departureTime <= now;

      return {
        roundTripId: trip.roundTripId ?? '',
        kind: RoundTripKind.TRIP,
        routeDirection: trip.routeDirection,
        tripId: trip.id,
        travelIntentId: null,
        origin: trip.origin,
        destination: trip.destination,
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        status: legStatus(confirmed, closed, match),
        confirmedPassengers: trip._count.passengers,
        match: closed ? null : match,
      };
    });

    const intentLegs = intents.map((intent): LegDraft => {
      // Quien publica intenciones ve a los conductores de los viajes. Una
      // sugerencia de un viaje que ya salió ya no se puede aceptar
      const match = pickMatch(
        intent.travelMatches
          .filter(
            (candidate) =>
              candidate.status === TravelMatchStatus.ACCEPTED ||
              candidate.trip.departureTime > now,
          )
          .map((candidate) => ({
            id: candidate.id,
            score: candidate.score,
            status: candidate.status,
            tripId: candidate.tripId,
            travelIntentId: candidate.travelIntentId,
            departureTime: candidate.trip.departureTime,
            personId: candidate.trip.driverId,
            car: candidate.trip.driver.studentProfile,
          })),
      );
      const confirmed = match?.status === TravelMatchStatus.ACCEPTED;
      const closed =
        !confirmed &&
        (intent.status !== TravelIntentStatus.ACTIVE ||
          intent.arrivalTime <= now);

      return {
        roundTripId: intent.roundTripId ?? '',
        kind: RoundTripKind.INTENT,
        routeDirection: intent.routeDirection,
        tripId: null,
        travelIntentId: intent.id,
        origin: intent.origin,
        destination: intent.destination,
        departureTime: intent.departureTime,
        arrivalTime: intent.arrivalTime,
        status: legStatus(confirmed, closed, match),
        match: closed ? null : match,
      };
    });

    const legs = [...tripLegs, ...intentLegs];
    const users = await this.displayNames.getPublicUsers([
      ...new Set(
        legs.flatMap((leg) => (leg.match ? [leg.match.personId] : [])),
      ),
    ]);

    // Los tramos ya vienen ordenados por salida: el paquete toma el orden de su
    // primer tramo
    const groups = new Map<string, LegDraft[]>();
    for (const leg of [...legs].sort(
      (a, b) => a.departureTime.getTime() - b.departureTime.getTime(),
    )) {
      groups.set(leg.roundTripId, [
        ...(groups.get(leg.roundTripId) ?? []),
        leg,
      ]);
    }

    return [...groups.entries()].map(([id, group]) => {
      const presentedLegs = group.map((leg) => ({
        routeDirection: leg.routeDirection,
        tripId: leg.tripId,
        travelIntentId: leg.travelIntentId,
        origin: leg.origin,
        destination: leg.destination,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        status: leg.status,
        ...(leg.confirmedPassengers !== undefined && {
          confirmedPassengers: leg.confirmedPassengers,
        }),
        match: leg.match && {
          id: leg.match.id,
          score: leg.match.score,
          status: leg.match.status,
          tripId: leg.match.tripId,
          travelIntentId: leg.match.travelIntentId,
          person: {
            id: leg.match.personId,
            displayName: users.get(leg.match.personId)?.displayName ?? null,
            photoUrl: users.get(leg.match.personId)?.photoUrl ?? null,
            ...(leg.match.car !== undefined && {
              carModel: leg.match.car?.carModel ?? null,
              carColor: leg.match.car?.carColor ?? null,
            }),
          },
        },
      }));

      return {
        id,
        kind: group[0].kind,
        jointScore: jointScore(presentedLegs),
        legs: presentedLegs,
      };
    });
  }
}

function legStatus(
  confirmed: boolean,
  closed: boolean,
  match: MatchCandidate | null,
): LegMatchStatus {
  if (confirmed) return 'CONFIRMED';
  if (closed) return 'CLOSED';
  return match ? 'PROPOSED' : 'PENDING';
}
