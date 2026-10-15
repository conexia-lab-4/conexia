import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  TravelIntentStatus,
  TravelMatchStatus,
} from '../../generated/prisma/client';
import { computeDetourKm, effectiveDetourToleranceKm } from '../geo/detour';
import { GeoService, type Coordinates } from '../geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { KpiEventType, Metric } from '../metrics/metric-names';
import {
  ALGORITHM_VERSION,
  computeScore,
  isDetourWithinTolerance,
  isTimeDeltaAllowed,
  meetsMinimumScore,
  minutesBetween,
  normalizeDetourKm,
} from './scoring';

interface Commitment {
  departureTime: Date;
  arrivalTime: Date;
}

interface MatchableTrip {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  departureTime: Date;
  arrivalTime: Date;
  capacity: number;
  passengers: { userId: string }[];
  driver: { studentProfile: { detourToleranceKm: number | null } | null };
}

interface MatchableIntent {
  id: string;
  userId: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  arrivalTime: Date;
}

interface MatchMetrics {
  score: number;
  detourKm: number;
  departureDeltaMinutes: number;
  arrivalDeltaMinutes: number;
}

interface TripRoute {
  origin: Coordinates;
  destination: Coordinates;
}

// "error" significa que no pudimos decidir (falló la API): no se invalida
// un match existente por un fallo transitorio
type Evaluation =
  | { kind: 'match'; metrics: MatchMetrics }
  | { kind: 'no-match' }
  | { kind: 'error' };

interface PairOutcome {
  tripId: string;
  travelIntentId: string;
  driverId: string;
  passengerId: string;
  evaluation: Evaluation;
}

type Scope = { tripId: string } | { travelIntentId: string };

const NO_MATCH: Evaluation = { kind: 'no-match' };
const ERROR: Evaluation = { kind: 'error' };

const TRIP_CANDIDATE_INCLUDE = {
  passengers: { select: { userId: true } },
  driver: {
    select: { studentProfile: { select: { detourToleranceKm: true } } },
  },
} satisfies Prisma.TripInclude;

const pairKey = (tripId: string, travelIntentId: string) =>
  `${tripId}:${travelIntentId}`;

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly metrics: MetricsService,
  ) {}

  // Nunca lanza: un fallo del matching no debe romper la publicación
  async matchTrip(tripId: string): Promise<void> {
    try {
      await this.runTripMatching(tripId);
    } catch (error) {
      this.logFailure(`del viaje ${tripId}`, error);
    }
  }

  async matchIntent(intentId: string): Promise<void> {
    try {
      await this.runIntentMatching(intentId);
    } catch (error) {
      this.logFailure(`de la intención ${intentId}`, error);
    }
  }

  private async runTripMatching(tripId: string) {
    const now = new Date();
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: TRIP_CANDIDATE_INCLUDE,
    });
    if (!trip) return;

    const intents = await this.prisma.travelIntent.findMany({
      where: { status: TravelIntentStatus.ACTIVE, arrivalTime: { gt: now } },
    });
    const commitments = await this.loadCommitments(
      intents.map((intent) => intent.userId),
      now,
    );
    const getRoute = this.lazyRoute(trip);

    const outcomes: PairOutcome[] = [];
    for (const intent of intents) {
      outcomes.push({
        tripId: trip.id,
        travelIntentId: intent.id,
        driverId: trip.driverId,
        passengerId: intent.userId,
        evaluation: await this.evaluatePair(
          trip,
          getRoute,
          intent,
          commitments,
          now,
        ),
      });
    }

    await this.persist({ tripId: trip.id }, outcomes);
  }

  private async runIntentMatching(intentId: string) {
    const now = new Date();
    const intent = await this.prisma.travelIntent.findUnique({
      where: { id: intentId },
    });
    if (!intent) return;

    const isMatchable =
      intent.status === TravelIntentStatus.ACTIVE && intent.arrivalTime > now;

    const trips = isMatchable
      ? await this.prisma.trip.findMany({
          where: { arrivalTime: { gt: now } },
          include: TRIP_CANDIDATE_INCLUDE,
        })
      : [];
    const commitments = isMatchable
      ? await this.loadCommitments([intent.userId], now)
      : new Map<string, Commitment[]>();

    const outcomes: PairOutcome[] = [];
    for (const trip of trips) {
      outcomes.push({
        tripId: trip.id,
        travelIntentId: intent.id,
        driverId: trip.driverId,
        passengerId: intent.userId,
        evaluation: await this.evaluatePair(
          trip,
          this.lazyRoute(trip),
          intent,
          commitments,
          now,
        ),
      });
    }

    await this.persist({ travelIntentId: intent.id }, outcomes);
  }

  private async evaluatePair(
    trip: MatchableTrip,
    getRoute: () => Promise<TripRoute | null>,
    intent: MatchableIntent,
    commitments: Map<string, Commitment[]>,
    now: Date,
  ): Promise<Evaluation> {
    // Filtros baratos primero, para no gastar requests al proveedor
    if (trip.driverId === intent.userId) return NO_MATCH;
    if (trip.arrivalTime <= now) return NO_MATCH;
    if (trip.passengers.length >= trip.capacity) return NO_MATCH;

    const departureDeltaMinutes = minutesBetween(
      trip.departureTime,
      intent.departureTime,
    );
    const arrivalDeltaMinutes = minutesBetween(
      trip.arrivalTime,
      intent.arrivalTime,
    );
    if (
      !isTimeDeltaAllowed(departureDeltaMinutes) ||
      !isTimeDeltaAllowed(arrivalDeltaMinutes)
    ) {
      return NO_MATCH;
    }

    if (this.hasConflict(intent.userId, trip, commitments)) return NO_MATCH;

    try {
      const route = await getRoute();
      if (!route) return NO_MATCH;

      const rawDetourKm = await computeDetourKm(this.geo, route, {
        origin: { lat: intent.originLat, lng: intent.originLng },
        destination: {
          lat: intent.destinationLat,
          lng: intent.destinationLng,
        },
      });
      if (rawDetourKm === null) return NO_MATCH;

      const detourKm = normalizeDetourKm(rawDetourKm);
      const detourToleranceKm = effectiveDetourToleranceKm(
        trip.driver.studentProfile?.detourToleranceKm,
      );
      if (!isDetourWithinTolerance(detourKm, detourToleranceKm)) {
        return NO_MATCH;
      }

      const score = computeScore({
        detourKm,
        detourToleranceKm,
        departureDeltaMinutes,
        arrivalDeltaMinutes,
      });
      if (!meetsMinimumScore(score)) return NO_MATCH;

      return {
        kind: 'match',
        metrics: {
          score,
          detourKm,
          departureDeltaMinutes,
          arrivalDeltaMinutes,
        },
      };
    } catch (error) {
      this.logger.warn(
        `No se pudo evaluar el viaje ${trip.id} contra la intención ${intent.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return ERROR;
    }
  }

  // Las coordenadas del viaje se resuelven una sola vez, y solo si algún
  // par supera los filtros baratos
  private lazyRoute(trip: MatchableTrip): () => Promise<TripRoute | null> {
    let cached: Promise<TripRoute | null> | undefined;
    return () => {
      cached ??= this.resolveRoute(trip);
      return cached;
    };
  }

  private async resolveRoute(trip: MatchableTrip): Promise<TripRoute | null> {
    if (
      trip.originLat !== null &&
      trip.originLng !== null &&
      trip.destinationLat !== null &&
      trip.destinationLng !== null
    ) {
      return {
        origin: { lat: trip.originLat, lng: trip.originLng },
        destination: { lat: trip.destinationLat, lng: trip.destinationLng },
      };
    }

    // Viaje anterior a la geocodificación: se reintenta resolver sus
    // direcciones. Si no se ubican, no hay matches pero el viaje no se toca.
    const [origin, destination] = await Promise.all([
      this.geo.geocode(trip.origin),
      this.geo.geocode(trip.destination),
    ]);
    if (!origin || !destination) return null;

    try {
      await this.prisma.trip.update({
        where: { id: trip.id },
        data: {
          originLat: origin.lat,
          originLng: origin.lng,
          destinationLat: destination.lat,
          destinationLng: destination.lng,
        },
      });
    } catch (error) {
      this.logger.warn(
        `No se pudieron guardar las coordenadas del viaje ${trip.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return { origin, destination };
  }

  // Viajes sin terminar en los que cada usuario ya participa (como conductor
  // o como pasajero), para detectar solapamientos
  private async loadCommitments(userIds: string[], now: Date) {
    const wanted = new Set(userIds);
    const commitments = new Map<string, Commitment[]>();
    if (wanted.size === 0) return commitments;

    const ids = [...wanted];
    const trips = await this.prisma.trip.findMany({
      where: {
        arrivalTime: { gt: now },
        OR: [
          { driverId: { in: ids } },
          { passengers: { some: { userId: { in: ids } } } },
        ],
      },
      select: {
        driverId: true,
        departureTime: true,
        arrivalTime: true,
        passengers: { select: { userId: true } },
      },
    });

    for (const trip of trips) {
      const involved = new Set([
        trip.driverId,
        ...trip.passengers.map((passenger) => passenger.userId),
      ]);
      for (const userId of involved) {
        if (!wanted.has(userId)) continue;
        const list = commitments.get(userId) ?? [];
        list.push({
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
        });
        commitments.set(userId, list);
      }
    }

    return commitments;
  }

  private hasConflict(
    userId: string,
    trip: MatchableTrip,
    commitments: Map<string, Commitment[]>,
  ): boolean {
    return (commitments.get(userId) ?? []).some(
      (commitment) =>
        commitment.departureTime < trip.arrivalTime &&
        commitment.arrivalTime > trip.departureTime,
    );
  }

  private async persist(scope: Scope, outcomes: PairOutcome[]) {
    const existing = await this.prisma.travelMatch.findMany({ where: scope });

    // Un match aceptado o rechazado no se vuelve a tocar
    const resolved = new Set(
      existing
        .filter(
          (match) =>
            match.status === TravelMatchStatus.ACCEPTED ||
            match.status === TravelMatchStatus.REJECTED,
        )
        .map((match) => pairKey(match.tripId, match.travelIntentId)),
    );

    const matches: {
      tripId: string;
      travelIntentId: string;
      driverId: string;
      passengerId: string;
      metrics: MatchMetrics;
    }[] = [];
    const undecided = new Set<string>();

    for (const outcome of outcomes) {
      const { evaluation } = outcome;
      if (evaluation.kind === 'match') {
        matches.push({
          tripId: outcome.tripId,
          travelIntentId: outcome.travelIntentId,
          driverId: outcome.driverId,
          passengerId: outcome.passengerId,
          metrics: evaluation.metrics,
        });
      } else if (evaluation.kind === 'error') {
        undecided.add(pairKey(outcome.tripId, outcome.travelIntentId));
      }
    }

    const matchedKeys = new Set(
      matches.map((match) => pairKey(match.tripId, match.travelIntentId)),
    );

    const pending = matches.filter(
      (match) => !resolved.has(pairKey(match.tripId, match.travelIntentId)),
    );

    // Las sugerencias que ya no se cumplen quedan como historial
    const staleIds = existing
      .filter((match) => {
        const key = pairKey(match.tripId, match.travelIntentId);
        return (
          match.status === TravelMatchStatus.SUGGESTED &&
          !matchedKeys.has(key) &&
          !undecided.has(key)
        );
      })
      .map((match) => match.id);

    if (pending.length === 0 && staleIds.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const { tripId, travelIntentId, metrics } of pending) {
        await tx.travelMatch.upsert({
          where: { tripId_travelIntentId: { tripId, travelIntentId } },
          create: {
            tripId,
            travelIntentId,
            ...metrics,
            algorithmVersion: ALGORITHM_VERSION,
            status: TravelMatchStatus.SUGGESTED,
          },
          update: {
            ...metrics,
            algorithmVersion: ALGORITHM_VERSION,
            status: TravelMatchStatus.SUGGESTED,
          },
        });
      }

      await tx.travelMatch.updateMany({
        where: { id: { in: staleIds } },
        data: { status: TravelMatchStatus.INVALIDATED },
      });

      // Un par cuenta como match nuevo una sola vez, aunque se recalcule
      // o pase por INVALIDATED y vuelva a sugerirse. Se cuenta por el lado
      // del conductor para no sumar dos veces el mismo par
      const created = await this.metrics.recordEvents(
        pending.map((match) => ({
          type: KpiEventType.MATCH_CREATED,
          refId: pairKey(match.tripId, match.travelIntentId),
          userId: match.driverId,
        })),
        tx,
      );
      await this.metrics.increment(Metric.MATCHES_CREATED, created, tx);

      await this.metrics.recordEvents(
        pending.map((match) => ({
          type: KpiEventType.MATCH_CREATED,
          refId: pairKey(match.tripId, match.travelIntentId),
          userId: match.passengerId,
        })),
        tx,
      );
    });
  }

  private logFailure(subject: string, error: unknown) {
    this.logger.error(
      `No se pudo ejecutar el matching ${subject}`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
