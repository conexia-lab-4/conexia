import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

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
