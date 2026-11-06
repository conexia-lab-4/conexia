import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  RouteDirection,
  type TravelIntentStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { TripsService } from '../trips/trips.service';
import { TravelIntentsService } from '../travel-intents/travel-intents.service';
import type { RouteLeg } from '../universities/campus-route';
import { CreateRoundTripDto, RoundTripKind } from './dto/create-round-trip.dto';

// Un viaje no tiene estado propio: se informa si ya salió
type TripLegStatus = 'UPCOMING' | 'DEPARTED';

interface LegRecord {
  id: string;
  origin: string;
  destination: string;
  routeDirection: RouteDirection | null;
  departureTime: Date;
  arrivalTime: Date;
}

@Injectable()
export class RoundTripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly intents: TravelIntentsService,
    private readonly matching: MatchingService,
  ) {}

  // Publica la ida y la vuelta juntas: si falla cualquiera, no se crea ninguna
  async create(userId: string, dto: CreateRoundTripDto) {
    if (dto.routeDirection !== RouteDirection.TO_CAMPUS) {
      throw new BadRequestException(
        'La vuelta solo se puede agregar a un viaje de ida a la universidad',
      );
    }

    const legs: RouteLeg[] = [
      {
        routeDirection: RouteDirection.TO_CAMPUS,
        departureTime: new Date(dto.departureTime),
        arrivalTime: new Date(dto.arrivalTime),
      },
      {
        routeDirection: RouteDirection.FROM_CAMPUS,
        departureTime: new Date(dto.return.departureTime),
        arrivalTime: new Date(dto.return.arrivalTime),
      },
    ];

    if (legs[1].departureTime <= legs[0].arrivalTime) {
      throw new BadRequestException(
        'La vuelta tiene que salir después de la llegada de la ida',
      );
    }

    const roundTripId = randomUUID();

    if (dto.kind === RoundTripKind.TRIP) {
      const draft = await this.trips.prepareTrips(userId, dto);
      const created = await this.prisma.$transaction((tx) =>
        this.trips.createTrips(tx, userId, draft, legs, roundTripId),
      );

      for (const trip of created) {
        await this.matching.matchTrip(trip.id);
      }

      return this.present(roundTripId, RoundTripKind.TRIP, created);
    }

    const route = await this.intents.prepareIntents(userId, dto, legs);
    const created = await this.prisma.$transaction((tx) =>
      this.intents.createIntents(tx, userId, route, legs, roundTripId),
    );

    for (const intent of created) {
      await this.matching.matchIntent(intent.id);
    }

    return this.present(roundTripId, RoundTripKind.INTENT, created);
  }

  // Solo lo ve quien lo publicó: uno ajeno se responde igual que uno inexistente
  async findOneOrThrow(id: string, userId: string) {
    const orderBy = { departureTime: 'asc' } as const;

    const trips = await this.prisma.trip.findMany({
      where: { roundTripId: id, driverId: userId },
      orderBy,
    });
    if (trips.length > 0) {
      return this.present(id, RoundTripKind.TRIP, trips);
    }

    const intents = await this.prisma.travelIntent.findMany({
      where: { roundTripId: id, userId },
      orderBy,
    });
    if (intents.length > 0) {
      return this.present(id, RoundTripKind.INTENT, intents);
    }

    throw new NotFoundException('El viaje de ida y vuelta no existe');
  }

  private present(
    id: string,
    kind: RoundTripKind,
    legs: (LegRecord & { status?: TravelIntentStatus })[],
  ) {
    const now = new Date();

    return {
      id,
      kind,
      legs: legs.map((leg) => ({
        id: leg.id,
        routeDirection: leg.routeDirection,
        status: this.legStatus(kind, leg, now),
        origin: leg.origin,
        destination: leg.destination,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
      })),
    };
  }

  // Las intenciones tienen estado propio; un viaje solo informa si ya salió
  private legStatus(
    kind: RoundTripKind,
    leg: LegRecord & { status?: TravelIntentStatus },
    now: Date,
  ): TravelIntentStatus | TripLegStatus | undefined {
    if (kind === RoundTripKind.INTENT) return leg.status;
    return leg.departureTime <= now ? 'DEPARTED' : 'UPCOMING';
  }
}
