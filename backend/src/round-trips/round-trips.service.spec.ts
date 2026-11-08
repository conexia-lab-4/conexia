import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoundTripsService } from './round-trips.service';
import { CreateRoundTripDto, RoundTripKind } from './dto/create-round-trip.dto';
import { TripsService } from '../trips/trips.service';
import { TravelIntentsService } from '../travel-intents/travel-intents.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from '../matching/matching.service';
import { MetricsService } from '../metrics/metrics.service';
import { DisplayNamesService } from '../firebase/display-names.service';
import { ChatService } from '../chat/chat.service';

describe('RoundTripsService', () => {
  let service: RoundTripsService;
  let prismaMock: {
    studentProfile: { findUnique: jest.Mock };
    campus: { findUnique: jest.Mock };
    trip: { create: jest.Mock; findMany: jest.Mock };
    travelIntent: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  let matchingMock: { matchTrip: jest.Mock; matchIntent: jest.Mock };
  let metricsMock: { increment: jest.Mock; recordEvents: jest.Mock };

  const userId = 'user-123';
  const now = new Date('2026-10-01T12:00:00.000Z');
  const homeCoords = { lat: -34.3255, lng: -59.0003 };
  const campus = {
    id: 'ua-pilar',
    name: 'Sede Pilar',
    latitude: -34.4515,
    longitude: -58.8621,
    university: { id: 'ua', name: 'Universidad Austral' },
  };
  const campusLabel = 'Universidad Austral - Sede Pilar';
  const campusCoords = { lat: campus.latitude, lng: campus.longitude };

  const dto = (
    overrides: Partial<CreateRoundTripDto> = {},
  ): CreateRoundTripDto => ({
    kind: RoundTripKind.TRIP,
    origin: 'Los Cardales',
    destination: 'lo que escriba',
    campusId: 'ua-pilar',
    routeDirection: 'TO_CAMPUS',
    departureTime: '2026-10-05T08:00:00.000Z',
    arrivalTime: '2026-10-05T09:00:00.000Z',
    return: {
      departureTime: '2026-10-05T18:00:00.000Z',
      arrivalTime: '2026-10-05T19:00:00.000Z',
    },
    ...overrides,
  });

  // Devuelve lo que se creó con un id por tramo, como la base
  const echoCreate = (prefix: string, defaults: object = {}) => {
    let count = 0;
    return ({ data }: { data: object }) =>
      Promise.resolve({ ...defaults, ...data, id: `${prefix}-${++count}` });
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      studentProfile: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ hasCar: true, availableSeats: 3 }),
      },
      campus: { findUnique: jest.fn().mockResolvedValue(campus) },
      trip: {
        create: jest.fn(echoCreate('trip')),
        findMany: jest.fn().mockResolvedValue([]),
      },
      travelIntent: {
        create: jest.fn(echoCreate('intent', { status: 'ACTIVE' })),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(),
    };
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    geoMock = {
      geocode: jest.fn().mockResolvedValue(homeCoords),
      getRouteDistanceKm: jest.fn(),
    };
    matchingMock = {
      matchTrip: jest.fn().mockResolvedValue(undefined),
      matchIntent: jest.fn().mockResolvedValue(undefined),
    };
    metricsMock = {
      increment: jest.fn(),
      recordEvents: jest.fn().mockResolvedValue(1),
    };

    const prisma = prismaMock as unknown as PrismaService;
    const matching = matchingMock as unknown as MatchingService;
    const metrics = metricsMock as unknown as MetricsService;
    service = new RoundTripsService(
      prisma,
      new TripsService(
        prisma,
        geoMock,
        matching,
        metrics,
        {} as DisplayNamesService,
        {} as ChatService,
      ),
      new TravelIntentsService(prisma, geoMock, matching, metrics),
      matching,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createdData = (mock: jest.Mock, call: number) =>
    (mock.mock.calls[call] as [{ data: Record<string, unknown> }])[0].data;

  describe('create', () => {
    it('crea la ida y la vuelta como dos viajes del mismo paquete', async () => {
      const result = await service.create(userId, dto());

      expect(prismaMock.trip.create).toHaveBeenCalledTimes(2);
      const outbound = createdData(prismaMock.trip.create, 0);
      const back = createdData(prismaMock.trip.create, 1);

      expect(outbound).toEqual({
        driverId: userId,
        origin: 'Los Cardales',
        originLat: homeCoords.lat,
        originLng: homeCoords.lng,
        destination: campusLabel,
        destinationLat: campusCoords.lat,
        destinationLng: campusCoords.lng,
        campusId: 'ua-pilar',
        routeDirection: 'TO_CAMPUS',
        departureTime: new Date('2026-10-05T08:00:00.000Z'),
        arrivalTime: new Date('2026-10-05T09:00:00.000Z'),
        capacity: 3,
        roundTripId: result.id,
      });
      // La vuelta invierte los extremos y conserva la sede y los asientos
      expect(back).toEqual({
        driverId: userId,
        origin: campusLabel,
        originLat: campusCoords.lat,
        originLng: campusCoords.lng,
        destination: 'Los Cardales',
        destinationLat: homeCoords.lat,
        destinationLng: homeCoords.lng,
        campusId: 'ua-pilar',
        routeDirection: 'FROM_CAMPUS',
        departureTime: new Date('2026-10-05T18:00:00.000Z'),
        arrivalTime: new Date('2026-10-05T19:00:00.000Z'),
        capacity: 3,
        roundTripId: result.id,
      });
      expect(geoMock.geocode).toHaveBeenCalledTimes(1);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);

      expect(result.id).toEqual(expect.any(String));
      expect(result).toMatchObject({
        kind: 'TRIP',
        legs: [
          expect.objectContaining({
            id: 'trip-1',
            routeDirection: 'TO_CAMPUS',
            status: 'UPCOMING',
          }),
          expect.objectContaining({
            id: 'trip-2',
            routeDirection: 'FROM_CAMPUS',
            status: 'UPCOMING',
          }),
        ],
      });
    });

    it('registra los dos viajes en las métricas y corre el matching de cada uno', async () => {
      await service.create(userId, dto());

      expect(metricsMock.increment).toHaveBeenCalledTimes(2);
      expect(matchingMock.matchTrip).toHaveBeenNthCalledWith(1, 'trip-1');
      expect(matchingMock.matchTrip).toHaveBeenNthCalledWith(2, 'trip-2');
    });

    it('crea la ida y la vuelta como dos intenciones del mismo paquete', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);

      const result = await service.create(
        userId,
        dto({ kind: RoundTripKind.INTENT }),
      );

      expect(prismaMock.trip.create).not.toHaveBeenCalled();
      expect(prismaMock.travelIntent.create).toHaveBeenCalledTimes(2);
      expect(createdData(prismaMock.travelIntent.create, 1)).toMatchObject({
        userId,
        origin: campusLabel,
        destination: 'Los Cardales',
        routeDirection: 'FROM_CAMPUS',
        roundTripId: result.id,
      });
      expect(result.legs.map((leg) => leg.status)).toEqual([
        'ACTIVE',
        'ACTIVE',
      ]);
      expect(matchingMock.matchIntent).toHaveBeenCalledTimes(2);
    });

    it('valida que ninguna de las dos intenciones se solape con otra activa', async () => {
      prismaMock.travelIntent.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'otra' });

      await expect(
        service.create(userId, dto({ kind: RoundTripKind.INTENT })),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.travelIntent.findFirst).toHaveBeenLastCalledWith({
        where: {
          userId,
          status: 'ACTIVE',
          departureTime: { lt: new Date('2026-10-05T19:00:00.000Z') },
          arrivalTime: { gt: new Date('2026-10-05T18:00:00.000Z') },
        },
      });
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('rechaza intenciones con la ida en el pasado', async () => {
      await expect(
        service.create(
          userId,
          dto({
            kind: RoundTripKind.INTENT,
            departureTime: '2026-09-30T08:00:00.000Z',
            arrivalTime: '2026-09-30T09:00:00.000Z',
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.travelIntent.create).not.toHaveBeenCalled();
    });

    it('rechaza agregar otro tramo si el primero es de vuelta', async () => {
      await expect(
        service.create(userId, dto({ routeDirection: 'FROM_CAMPUS' })),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
      expect(geoMock.geocode).not.toHaveBeenCalled();
    });

    it.each([
      ['antes de la llegada de la ida', '2026-10-05T08:30:00.000Z'],
      ['justo a la llegada de la ida', '2026-10-05T09:00:00.000Z'],
    ])('rechaza una vuelta que sale %s', async (_case, departureTime) => {
      await expect(
        service.create(
          userId,
          dto({
            return: { departureTime, arrivalTime: '2026-10-05T20:00:00.000Z' },
          }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('rechaza un paquete de viajes si el usuario no tiene auto', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({ hasCar: false });

      await expect(service.create(userId, dto())).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('no informa éxito ni corre el matching si falla el segundo tramo', async () => {
      prismaMock.trip.create
        .mockResolvedValueOnce({ id: 'trip-1' })
        .mockRejectedValueOnce(new Error('fallo de la base'));

      await expect(service.create(userId, dto())).rejects.toThrow(
        'fallo de la base',
      );
      // Los dos tramos se crean en la misma transacción, que se revierte
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(matchingMock.matchTrip).not.toHaveBeenCalled();
    });

    it('no crea nada si la casa no se puede ubicar', async () => {
      geoMock.geocode.mockResolvedValue(null);

      await expect(service.create(userId, dto())).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOneOrThrow', () => {
    const leg = (
      id: string,
      routeDirection: string,
      departureTime: string,
    ) => ({
      id,
      origin: 'A',
      destination: 'B',
      routeDirection,
      departureTime: new Date(departureTime),
      arrivalTime: new Date(departureTime),
    });

    it('devuelve los dos viajes del paquete del conductor', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        leg('trip-1', 'TO_CAMPUS', '2026-09-30T08:00:00.000Z'),
        leg('trip-2', 'FROM_CAMPUS', '2026-10-05T18:00:00.000Z'),
      ]);

      const result = await service.findOneOrThrow('paquete-1', userId);

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: { roundTripId: 'paquete-1', driverId: userId },
        orderBy: { departureTime: 'asc' },
      });
      expect(result.kind).toBe('TRIP');
      expect(result.legs.map((item) => [item.id, item.status])).toEqual([
        ['trip-1', 'DEPARTED'],
        ['trip-2', 'UPCOMING'],
      ]);
    });

    it('devuelve las intenciones del paquete con su estado', async () => {
      prismaMock.travelIntent.findMany.mockResolvedValue([
        {
          ...leg('intent-1', 'TO_CAMPUS', '2026-10-05T08:00:00.000Z'),
          status: 'FULFILLED',
        },
        {
          ...leg('intent-2', 'FROM_CAMPUS', '2026-10-05T18:00:00.000Z'),
          status: 'ACTIVE',
        },
      ]);

      const result = await service.findOneOrThrow('paquete-1', userId);

      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith({
        where: { roundTripId: 'paquete-1', userId },
        orderBy: { departureTime: 'asc' },
      });
      expect(result.kind).toBe('INTENT');
      expect(result.legs.map((item) => item.status)).toEqual([
        'FULFILLED',
        'ACTIVE',
      ]);
    });

    it('responde 404 si el paquete no existe o es de otro usuario', async () => {
      await expect(service.findOneOrThrow('paquete-1', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
