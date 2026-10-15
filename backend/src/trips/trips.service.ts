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
import { type TripScope } from './dto/list-my-trips.dto';
import { Prisma } from '../../generated/prisma/client';
import { MatchingService } from '../matching/matching.service';
import { addPassenger, isSerializationConflict } from './trip-participation';
import { MetricsService } from '../metrics/metrics.service';
import { KpiEventType, Metric } from '../metrics/metric-names';

type PassengerLocation = {
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
};

const HIDDEN_LOCATION: PassengerLocation = {
  pickupAddress: null,
  pickupLat: null,
  pickupLng: null,
  dropoffAddress: null,
  dropoffLat: null,
  dropoffLng: null,
};

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly matching: MatchingService,
    private readonly metrics: MetricsService,
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

    const trip = await this.prisma.$transaction(async (tx) => {
      const created = await tx.trip.create({
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

      await this.metrics.increment(Metric.TRIPS_PUBLISHED, 1, tx);
      await this.metrics.recordEvents(
        [{ type: KpiEventType.TRIP_PUBLISHED, refId: created.id, userId }],
        tx,
      );

      return created;
    });

    await this.matching.matchTrip(trip.id);

    return trip;
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

  async findMine(
    userId: string,
    scope: TripScope = 'upcoming',
    page: { limit?: number; offset?: number } = {},
  ) {
    const now = new Date();
    const isHistory = scope === 'history';
    const direction = isHistory ? 'desc' : 'asc';

    const trips = await this.prisma.trip.findMany({
      where: {
        departureTime: isHistory ? { lte: now } : { gt: now },
        OR: [{ driverId: userId }, { passengers: { some: { userId } } }],
      },
      // El id desempata viajes con la misma salida, para que las páginas
      // no repitan ni salteen viajes
      orderBy: [{ departureTime: direction }, { id: 'asc' }],
      take: page.limit,
      skip: page.offset,
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

    await this.matching.matchTrip(updated.id);

    return this.withDerivedFields(updated, userId);
  }

  async join(tripId: string, userId: string) {
    try {
      const passenger = await this.prisma.$transaction(
        (tx) => addPassenger(tx, tripId, userId, { rejectStarted: true }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // El viaje pudo quedar lleno: se recalculan sus sugerencias pendientes
      await this.matching.matchTrip(tripId);

      return passenger;
    } catch (error) {
      if (isSerializationConflict(error)) {
        throw new ConflictException(
          'No pudimos confirmar tu lugar, intentá de nuevo',
        );
      }

      throw error;
    }
  }

  async leave(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { departureTime: true },
    });

    // Un viaje que ya salió pasa al historial: no se puede salir de él
    if (trip && trip.departureTime <= new Date()) {
      throw new ConflictException('El viaje ya empezó y no se puede abandonar');
    }

    const deleted = await this.prisma.tripPassenger.deleteMany({
      where: { tripId, userId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('No participás de este viaje');
    }

    await this.matching.matchTrip(tripId);
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
      departureTime: Date;
      passengers: ({ userId: string } & PassengerLocation)[];
    },
  >(trip: T, userId: string) {
    const isDriver = trip.driverId === userId;
    const isParticipant =
      isDriver ||
      trip.passengers.some((passenger) => passenger.userId === userId);

    // La ubicación de recogida y destino solo la ven el conductor y cada
    // pasajero respecto de la suya; para el resto va en null
    const passengers = trip.passengers.map((passenger) =>
      isDriver || passenger.userId === userId
        ? passenger
        : { ...passenger, ...HIDDEN_LOCATION },
    );

    return {
      ...trip,
      passengers,
      availableSeats: trip.capacity - trip.passengers.length,
      isDriver,
      isParticipant,
      isHistorical: trip.departureTime <= new Date(),
    };
  }
}
