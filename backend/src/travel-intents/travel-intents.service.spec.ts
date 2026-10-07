import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TravelIntentsService } from './travel-intents.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTravelIntentDto } from './dto/create-travel-intent.dto';

describe('TravelIntentsService', () => {
  let service: TravelIntentsService;
  let prismaMock: {
    travelIntent: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  const userId = 'user-123';
  const now = new Date('2026-10-01T12:00:00.000Z');

  const validDto: CreateTravelIntentDto = {
    origin: 'Los Cardales',
    destination: 'Universidad Austral, Pilar',
    departureTime: '2026-10-05T08:00:00.000Z',
    arrivalTime: '2026-10-05T09:00:00.000Z',
  };
  const originCoords = { lat: -34.3255, lng: -59.0003 };
  const destinationCoords = { lat: -34.4545, lng: -58.8686 };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      travelIntent: {
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    geoMock = {
      geocode: jest.fn((address: string) =>
        Promise.resolve(
          address === validDto.origin ? originCoords : destinationCoords,
        ),
      ),
      getRouteDistanceKm: jest.fn(),
    };
    service = new TravelIntentsService(
      prismaMock as unknown as PrismaService,
      geoMock,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('create', () => {
    it('crea la intención con las coordenadas resueltas por GeoService', async () => {
      const created = { id: 'intent-1', status: 'ACTIVE' };
      prismaMock.travelIntent.create.mockResolvedValue(created);

      const result = await service.create(userId, validDto);

      expect(result).toEqual(created);
      expect(prismaMock.travelIntent.create).toHaveBeenCalledWith({
        data: {
          userId,
          origin: validDto.origin,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destination: validDto.destination,
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng,
          departureTime: new Date(validDto.departureTime),
          arrivalTime: new Date(validDto.arrivalTime),
        },
      });
    });

    it('responde 400 y no persiste si el origen no se resuelve', async () => {
      geoMock.geocode.mockImplementation((address: string) =>
        Promise.resolve(address === validDto.origin ? null : destinationCoords),
      );

      await expect(service.create(userId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('responde 400 y no persiste si el destino no se resuelve', async () => {
      geoMock.geocode.mockImplementation((address: string) =>
        Promise.resolve(address === validDto.origin ? originCoords : null),
      );

      await expect(service.create(userId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('rechaza una intención que se superpone con otra activa sin geocodificar', async () => {
      prismaMock.travelIntent.findFirst.mockResolvedValue({ id: 'otra' });

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.travelIntent.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          status: 'ACTIVE',
          departureTime: { lt: new Date(validDto.arrivalTime) },
          arrivalTime: { gt: new Date(validDto.departureTime) },
        },
      });
      expect(geoMock.geocode).not.toHaveBeenCalled();
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('rechaza una salida en el pasado', async () => {
      await expect(
        service.create(userId, {
          ...validDto,
          departureTime: '2026-09-30T08:00:00.000Z',
          arrivalTime: '2026-09-30T09:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('marca como EXPIRED las intenciones vencidas antes de chequear superposición', async () => {
      prismaMock.travelIntent.create.mockResolvedValue({ id: 'intent-1' });

      await service.create(userId, validDto);

      expect(prismaMock.travelIntent.updateMany).toHaveBeenCalledWith({
        where: { userId, status: 'ACTIVE', arrivalTime: { lte: now } },
        data: { status: 'EXPIRED' },
      });
    });
  });

  describe('findMine', () => {
    it('vence las intenciones pasadas y devuelve las del usuario', async () => {
      const intents = [{ id: 'intent-1' }];
      prismaMock.travelIntent.findMany.mockResolvedValue(intents);

      const result = await service.findMine(userId);

      expect(result).toEqual(intents);
      expect(prismaMock.travelIntent.updateMany).toHaveBeenCalled();
      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { departureTime: 'asc' },
      });
    });
  });

  describe('cancel', () => {
    it('cancela una intención activa propia', async () => {
      prismaMock.travelIntent.findUnique.mockResolvedValue({
        id: 'intent-1',
        userId,
        status: 'ACTIVE',
      });
      prismaMock.travelIntent.update.mockResolvedValue({
        id: 'intent-1',
        status: 'CANCELLED',
      });

      const result = await service.cancel('intent-1', userId);

      expect(result.status).toBe('CANCELLED');
      expect(prismaMock.travelIntent.update).toHaveBeenCalledWith({
        where: { id: 'intent-1' },
        data: { status: 'CANCELLED' },
      });
    });

    it('lanza NotFoundException si no existe', async () => {
      prismaMock.travelIntent.findUnique.mockResolvedValue(null);

      await expect(service.cancel('intent-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException si la intención es de otro usuario', async () => {
      prismaMock.travelIntent.findUnique.mockResolvedValue({
        id: 'intent-1',
        userId: 'otro-user',
        status: 'ACTIVE',
      });

      await expect(service.cancel('intent-1', userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.travelIntent.update).not.toHaveBeenCalled();
    });

    it.each(['CANCELLED', 'FULFILLED', 'EXPIRED'])(
      'rechaza cancelar una intención %s',
      async (status) => {
        prismaMock.travelIntent.findUnique.mockResolvedValue({
          id: 'intent-1',
          userId,
          status,
        });

        await expect(service.cancel('intent-1', userId)).rejects.toThrow(
          ConflictException,
        );
        expect(prismaMock.travelIntent.update).not.toHaveBeenCalled();
      },
    );
  });

  describe('findMatchable', () => {
    it('solo devuelve intenciones ACTIVE cuyo horario no pasó', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([]);

      await service.findMatchable();

      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', arrivalTime: { gt: now } },
        orderBy: { departureTime: 'asc' },
      });
    });
  });
});
