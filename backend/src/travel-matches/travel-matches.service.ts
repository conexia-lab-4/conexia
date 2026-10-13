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
import { PrismaService } from '../prisma/prisma.service';
import {
  addPassenger,
  isSerializationConflict,
} from '../trips/trip-participation';

@Injectable()
export class TravelMatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
  ) {}

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

          await addPassenger(tx, match.tripId, userId);

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

          return tx.travelMatch.update({
            where: { id: match.id },
            data: { status: TravelMatchStatus.ACCEPTED },
          });
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
}
