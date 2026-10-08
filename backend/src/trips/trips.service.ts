import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GeoService, type Coordinates } from '../geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async create(userId: string, dto: CreateTripDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile?.hasCar) {
      throw new ForbiddenException(
        'Solo los usuarios con auto pueden publicar viajes',
      );
    }

    // Se geocodifica antes de persistir: si alguna dirección no se resuelve,
    // no se crea el viaje
    const [originCoords, destinationCoords] = await Promise.all([
      this.geocodeOrThrow(dto.origin),
      this.geocodeOrThrow(dto.destination),
    ]);

    return this.prisma.trip.create({
      data: {
        driverId: userId,
        origin: dto.origin,
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destination: dto.destination,
        destinationLat: destinationCoords.lat,
        destinationLng: destinationCoords.lng,
        departureTime: new Date(dto.departureTime),
        arrivalTime: new Date(dto.arrivalTime),
        capacity: profile.availableSeats ?? 0,
      },
      include: { passengers: true },
    });
  }

  async findUpcoming(userId: string) {
    const trips = await this.prisma.trip.findMany({
      where: { departureTime: { gt: new Date() } },
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

  async update(id: string, userId: string, dto: UpdateTripDto) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });

    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    if (trip.driverId !== userId) {
      throw new ForbiddenException('Solo el conductor puede editar el viaje');
    }

    if (trip.departureTime <= new Date()) {
      throw new ConflictException('No se puede editar un viaje que ya salió');
    }

    // El DTO valida los horarios solo si llegan los dos: se revalida contra
    // los valores actuales cuando se modifica uno solo
    const departureTime = dto.departureTime
      ? new Date(dto.departureTime)
      : trip.departureTime;
    const arrivalTime = dto.arrivalTime
      ? new Date(dto.arrivalTime)
      : trip.arrivalTime;

    if (arrivalTime <= departureTime) {
      throw new BadRequestException(
        'arrivalTime debe ser posterior a departureTime',
      );
    }

    const [originCoords, destinationCoords] = await Promise.all([
      this.resolveCoordinates(
        trip.origin,
        { lat: trip.originLat, lng: trip.originLng },
        dto.origin,
      ),
      this.resolveCoordinates(
        trip.destination,
        { lat: trip.destinationLat, lng: trip.destinationLng },
        dto.destination,
      ),
    ]);

    const updated = await this.prisma.trip.update({
      where: { id },
      data: {
        origin: dto.origin,
        destination: dto.destination,
        departureTime,
        arrivalTime,
        ...(originCoords && {
          originLat: originCoords.lat,
          originLng: originCoords.lng,
        }),
        ...(destinationCoords && {
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng,
        }),
      },
      include: {
        driver: { select: { id: true, email: true } },
        passengers: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    });

    return this.withDerivedFields(updated, userId);
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

  private async geocodeOrThrow(address: string): Promise<Coordinates> {
    const coords = await this.geo.geocode(address);
    if (!coords) {
      throw new BadRequestException(
        `No reconocemos la dirección "${address}". Probá con calle, altura y localidad.`,
      );
    }
    return coords;
  }

  // Solo vuelve a geocodificar si la dirección cambió o si el viaje todavía no
  // tiene coordenadas. Devuelve null cuando no hay que tocarlas.
  private async resolveCoordinates(
    currentAddress: string,
    current: { lat: number | null; lng: number | null },
    nextAddress: string | undefined,
  ): Promise<Coordinates | null> {
    const unchanged =
      nextAddress === undefined || nextAddress.trim() === currentAddress.trim();
    if (unchanged && current.lat !== null && current.lng !== null) {
      return null;
    }
    return this.geocodeOrThrow(nextAddress ?? currentAddress);
  }

  private withDerivedFields<
    T extends {
      driverId: string;
      capacity: number;
      passengers: { userId: string }[];
    },
  >(trip: T, userId: string) {
    const isDriver = trip.driverId === userId;
    const isParticipant =
      isDriver ||
      trip.passengers.some((passenger) => passenger.userId === userId);

    return {
      ...trip,
      availableSeats: trip.capacity - trip.passengers.length,
      isDriver,
      isParticipant,
    };
  }
}
