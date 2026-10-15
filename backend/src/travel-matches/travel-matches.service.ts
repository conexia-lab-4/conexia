import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TravelIntentStatus,
  TravelMatchStatus,
} from '../../generated/prisma/client';
import { MatchingService } from '../matching/matching.service';
import { KpiEventType } from '../metrics/metric-names';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  addPassenger,
  isSerializationConflict,
} from '../trips/trip-participation';
import { DisplayNamesService } from '../firebase/display-names.service';

@Injectable()
export class TravelMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly metrics: MetricsService,
    private readonly displayNames: DisplayNamesService,
  ) {}

  async findMine(userId: string) {
    const now = new Date();

    // Un match pendiente de un viaje que ya salió deja de ser válido
    await this.prisma.travelMatch.updateMany({
      where: {
        status: TravelMatchStatus.SUGGESTED,
        travelIntent: { userId },
        trip: { departureTime: { lte: now } },
      },
      data: { status: TravelMatchStatus.INVALIDATED },
    });

    const matches = await this.prisma.travelMatch.findMany({
      where: {
        status: TravelMatchStatus.SUGGESTED,
        travelIntent: { userId, status: TravelIntentStatus.ACTIVE },
      },
      orderBy: [
        { score: 'desc' },
        { trip: { departureTime: 'asc' } },
        { id: 'asc' },
      ],
      select: {
        id: true,
        status: true,
        score: true,
        detourKm: true,
        departureDeltaMinutes: true,
        arrivalDeltaMinutes: true,
        trip: {
          select: {
            id: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            capacity: true,
            _count: { select: { passengers: true } },
            driver: {
              select: {
                id: true,
                email: true,
                studentProfile: {
                  select: {
                    career: true,
                    year: true,
                    campus: true,
                    carModel: true,
                    carColor: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const names = await this.displayNames.getDisplayNames(
      matches.map((match) => match.trip.driver.id),
    );

    return matches.map((match) => {
      const { _count, driver, ...trip } = match.trip;

      return {
        ...match,
        trip: {
          ...trip,
          availableSeats: trip.capacity - _count.passengers,
          driver: {
            id: driver.id,
            email: driver.email,
            displayName: names.get(driver.id) ?? null,
            profile: driver.studentProfile,
          },
        },
      };
    });
  }

  async accept(matchId: string, userId: string) {
    try {
      const accepted = await this.prisma.$transaction(
        async (tx) => {
          const match = await tx.travelMatch.findUnique({
            where: { id: matchId },
            include: { trip: true, travelIntent: true },
          });

          // Un match ajeno se responde igual que uno inexistente
          if (!match || match.travelIntent.userId !== userId) {
            throw new NotFoundException('La coincidencia no existe');
          }

          if (match.status === TravelMatchStatus.ACCEPTED) {
            throw new ConflictException('La coincidencia ya fue aceptada');
          }

          if (match.status !== TravelMatchStatus.SUGGESTED) {
            throw new ConflictException(
              'La coincidencia ya no está disponible para aceptar',
            );
          }

          // Las condiciones se revalidan siempre, aunque el match se haya
          // generado válido
          const now = new Date();

          if (
            match.travelIntent.status !== TravelIntentStatus.ACTIVE ||
            match.travelIntent.arrivalTime <= now
          ) {
            throw new ConflictException(
              'Tu intención de viaje ya no está activa',
            );
          }

          if (match.trip.arrivalTime <= now) {
            throw new ConflictException('El viaje ya finalizó');
          }

          const passenger = await addPassenger(tx, match.tripId, userId);

          // La ubicación se copia: si la intención se cancela o vence después,
          // el viaje conserva dónde recoger y dejar al pasajero
          await tx.tripPassenger.update({
            where: { id: passenger.id },
            data: {
              pickupAddress: match.travelIntent.origin,
              pickupLat: match.travelIntent.originLat,
              pickupLng: match.travelIntent.originLng,
              dropoffAddress: match.travelIntent.destination,
              dropoffLat: match.travelIntent.destinationLat,
              dropoffLng: match.travelIntent.destinationLng,
            },
          });
          await tx.travelIntent.update({
            where: { id: match.travelIntentId },
            data: { status: TravelIntentStatus.FULFILLED },
          });

          await tx.travelMatch.updateMany({
            where: {
              travelIntentId: match.travelIntentId,
              id: { not: match.id },
              status: TravelMatchStatus.SUGGESTED,
            },
            data: { status: TravelMatchStatus.INVALIDATED },
          });

          const updated = await tx.travelMatch.update({
            where: { id: match.id },
            data: { status: TravelMatchStatus.ACCEPTED },
          });

          await this.metrics.recordEvents(
            [{ type: KpiEventType.MATCH_ACCEPTED, refId: match.id, userId }],
            tx,
          );

          return updated;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // El viaje pudo quedar lleno: se recalculan las demás sugerencias
      await this.matching.matchTrip(accepted.tripId);

      return accepted;
    } catch (error) {
      if (isSerializationConflict(error)) {
        throw new ConflictException(
          'No pudimos confirmar tu lugar, intentá de nuevo',
        );
      }
      throw error;
    }
  }

  // El rechazo es una decisión del pasajero: a diferencia de INVALIDATED,
  // cuenta para la tasa de aceptación y el matching no lo vuelve a sugerir
  async reject(matchId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // Un match ajeno se responde igual que uno inexistente
      const match = await tx.travelMatch.findFirst({
        where: { id: matchId, travelIntent: { userId } },
      });

      if (!match) {
        throw new NotFoundException('La coincidencia no existe');
      }

      if (match.status === TravelMatchStatus.REJECTED) {
        throw new ConflictException('La coincidencia ya fue rechazada');
      }

      if (match.status !== TravelMatchStatus.SUGGESTED) {
        throw new ConflictException(
          'La coincidencia ya no está disponible para rechazar',
        );
      }

      // Solo pasa a REJECTED si sigue SUGGESTED: si en el medio se aceptó o
      // se invalidó, no se pisa ese estado
      const { count } = await tx.travelMatch.updateMany({
        where: { id: match.id, status: TravelMatchStatus.SUGGESTED },
        data: { status: TravelMatchStatus.REJECTED },
      });

      if (count === 0) {
        throw new ConflictException(
          'La coincidencia ya no está disponible para rechazar',
        );
      }

      await this.metrics.recordEvents(
        [{ type: KpiEventType.MATCH_REJECTED, refId: match.id, userId }],
        tx,
      );

      return { ...match, status: TravelMatchStatus.REJECTED };
    });
  }
}
