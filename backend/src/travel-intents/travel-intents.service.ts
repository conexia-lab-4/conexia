import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GeoService, type Coordinates } from '../geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { TravelIntentStatus } from '../../generated/prisma/client';
import { CreateTravelIntentDto } from './dto/create-travel-intent.dto';

@Injectable()
export class TravelIntentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async create(userId: string, dto: CreateTravelIntentDto) {
    const departureTime = new Date(dto.departureTime);
    const arrivalTime = new Date(dto.arrivalTime);

    if (departureTime <= new Date()) {
      throw new BadRequestException(
        'El horario de salida tiene que ser posterior a ahora',
      );
    }

    await this.expireOverdue(userId);

    // Se chequea antes de geocodificar para no gastar requests al proveedor
    const overlapping = await this.prisma.travelIntent.findFirst({
      where: {
        userId,
        status: TravelIntentStatus.ACTIVE,
        departureTime: { lt: arrivalTime },
        arrivalTime: { gt: departureTime },
      },
    });

    if (overlapping) {
      throw new ConflictException(
        'Ya tenés una intención de viaje activa en ese horario',
      );
    }

    // Si alguna dirección no se resuelve, no se persiste la intención
    const [originCoords, destinationCoords] = await Promise.all([
      this.geocodeOrThrow(dto.origin),
      this.geocodeOrThrow(dto.destination),
    ]);

    return this.prisma.travelIntent.create({
      data: {
        userId,
        origin: dto.origin,
        originLat: originCoords.lat,
        originLng: originCoords.lng,
        destination: dto.destination,
        destinationLat: destinationCoords.lat,
        destinationLng: destinationCoords.lng,
        departureTime,
        arrivalTime,
      },
    });
  }

  async findMine(userId: string) {
    await this.expireOverdue(userId);

    return this.prisma.travelIntent.findMany({
      where: { userId },
      orderBy: { departureTime: 'asc' },
    });
  }

  async cancel(id: string, userId: string) {
    await this.expireOverdue(userId);

    const intent = await this.prisma.travelIntent.findUnique({ where: { id } });

    // Una intención ajena se responde igual que una inexistente
    if (!intent || intent.userId !== userId) {
      throw new NotFoundException('La intención de viaje no existe');
    }

    if (intent.status !== TravelIntentStatus.ACTIVE) {
      throw new ConflictException(
        'Solo se pueden cancelar intenciones de viaje activas',
      );
    }

    return this.prisma.travelIntent.update({
      where: { id },
      data: { status: TravelIntentStatus.CANCELLED },
    });
  }

  // Intenciones que pueden participar de nuevos matches: ACTIVE y con un
  // horario que todavía no pasó (aunque nadie las haya marcado EXPIRED)
  findMatchable() {
    return this.prisma.travelIntent.findMany({
      where: {
        status: TravelIntentStatus.ACTIVE,
        arrivalTime: { gt: new Date() },
      },
      orderBy: { departureTime: 'asc' },
    });
  }

  // Las intenciones vencidas se marcan EXPIRED al leerlas, sin un job aparte
  private expireOverdue(userId: string) {
    return this.prisma.travelIntent.updateMany({
      where: {
        userId,
        status: TravelIntentStatus.ACTIVE,
        arrivalTime: { lte: new Date() },
      },
      data: { status: TravelIntentStatus.EXPIRED },
    });
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
}
