import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTripDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile?.hasCar) {
      throw new ForbiddenException(
        'Solo los usuarios con auto pueden publicar viajes',
      );
    }

    return this.prisma.trip.create({
      data: {
        driverId: userId,
        origin: dto.origin,
        destination: dto.destination,
        departureTime: new Date(dto.departureTime),
        arrivalTime: new Date(dto.arrivalTime),
        capacity: profile.availableSeats ?? 0,
      },
      include: { passengers: true },
    });
  }

  async findUpcoming(userId: string) {
    const trips = await this.prisma.trip.findMany({
      where: {
        driverId: { not: userId },
        departureTime: { gt: new Date() },
      },
      orderBy: { departureTime: 'asc' },
      include: {
        driver: { select: { id: true, email: true } },
        passengers: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    return trips.map((trip) => this.withDerivedFields(trip, userId));
  }

  async findOneOrThrow(id: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        driver: { select: { id: true, email: true } },
        passengers: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    return this.withDerivedFields(trip, userId);
  }

  async join(tripId: string, userId: string) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const trip = await tx.trip.findUnique({
            where: { id: tripId },
            include: { passengers: true },
          });

          if (!trip) {
            throw new NotFoundException('El viaje no existe');
          }

          if (trip.driverId === userId) {
            throw new ForbiddenException(
              'El conductor no puede sumarse a su propio viaje como pasajero',
            );
          }

          if (
            trip.passengers.some((passenger) => passenger.userId === userId)
          ) {
            throw new ConflictException('Ya participás de este viaje');
          }

          if (trip.passengers.length >= trip.capacity) {
            throw new ConflictException('No quedan lugares disponibles');
          }

          const overlapping = await tx.trip.findFirst({
            where: {
              id: { not: tripId },
              departureTime: { lt: trip.arrivalTime },
              arrivalTime: { gt: trip.departureTime },
              OR: [{ driverId: userId }, { passengers: { some: { userId } } }],
            },
          });

          if (overlapping) {
            throw new ConflictException(
              'El viaje se solapa con otro viaje en el que participás',
            );
          }

          return tx.tripPassenger.create({
            data: { tripId, userId },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'No pudimos confirmar tu lugar, intentá de nuevo',
        );
      }
      throw error;
    }
  }

  async leave(tripId: string, userId: string) {
    const deleted = await this.prisma.tripPassenger.deleteMany({
      where: { tripId, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('No participás de este viaje');
    }
  }

  private withDerivedFields<
    T extends {
      driverId: string;
      capacity: number;
      passengers: { userId: string }[];
    },
  >(trip: T, userId: string) {
    const isParticipant =
      trip.driverId === userId ||
      trip.passengers.some((passenger) => passenger.userId === userId);

    return {
      ...trip,
      availableSeats: trip.capacity - trip.passengers.length,
      isParticipant,
    };
  }
}
