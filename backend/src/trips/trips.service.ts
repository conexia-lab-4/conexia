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

  async findOneOrThrow(id: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: { passengers: true },
    });

    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    return trip;
  }
}
