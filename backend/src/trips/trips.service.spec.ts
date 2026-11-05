import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { Prisma } from '../../generated/prisma/client';
import { MatchingService } from '../matching/matching.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  DisplayNamesService,
  type PublicUser,
} from '../firebase/display-names.service';

describe('TripsService', () => {
  let service: TripsService;
  let prismaMock: {
    studentProfile: { findUnique: jest.Mock };
    trip: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    tripPassenger: { create: jest.Mock; deleteMany: jest.Mock };
    campus: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  let matchingMock: { matchTrip: jest.Mock };
  let displayNamesMock: { getPublicUsers: jest.Mock };
  let metricsMock: { increment: jest.Mock; recordEvents: jest.Mock };
  const userId = 'user-123';

  const validDto: CreateTripDto = {
    origin: 'Pilar',
    destination: 'Palermo',
    campusId: 'ua-pilar',
    routeDirection: 'TO_CAMPUS',
    departureTime: '2026-10-05T08:00:00.000Z',
    arrivalTime: '2026-10-05T09:00:00.000Z',
  };

  const originCoords = { lat: -34.4587, lng: -58.9142 };
  const destinationCoords = { lat: -34.5889, lng: -58.4306 };
  const campus = {
    id: 'ua-pilar',
    name: 'Sede Pilar',
    latitude: -34.4515,
    longitude: -58.8621,
    university: { id: 'ua', name: 'Universidad Austral' },
  };
  const campusLabel = 'Universidad Austral - Sede Pilar';
  const campusCoords = { lat: campus.latitude, lng: campus.longitude };

  beforeEach(() => {
    prismaMock = {
      studentProfile: { findUnique: jest.fn() },
      trip: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      tripPassenger: { create: jest.fn(), deleteMany: jest.fn() },
      campus: { findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prismaMock.campus.findUnique.mockResolvedValue(campus);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    geoMock = {
      geocode: jest.fn((address: string) =>
        Promise.resolve(
          address === validDto.origin ? originCoords : destinationCoords,
        ),
      ),
      getRouteDistanceKm: jest.fn(),
    };
    matchingMock = { matchTrip: jest.fn().mockResolvedValue(undefined) };
    metricsMock = {
      increment: jest.fn(),
      recordEvents: jest.fn().mockResolvedValue(1),
    };
    displayNamesMock = {
      getPublicUsers: jest
        .fn()
        .mockResolvedValue(new Map<string, PublicUser>()),
    };
    service = new TripsService(
      prismaMock as unknown as PrismaService,
      geoMock,
      matchingMock as unknown as MatchingService,
      metricsMock as unknown as MetricsService,
      displayNamesMock as unknown as DisplayNamesService,
    );
  });

  describe('create', () => {
    it('rechaza cuando el usuario no tiene perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no tiene auto sin geocodificar', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: false,
        availableSeats: null,
      });

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(geoMock.geocode).not.toHaveBeenCalled();
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('publica el viaje con la casa geocodificada, la sede del catálogo y los asientos del perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      const created = { id: 'trip-1', ...validDto, capacity: 3 };
      prismaMock.trip.create.mockResolvedValue(created);

      const result = await service.create(userId, validDto);

      expect(result).toEqual(created);
      expect(geoMock.geocode).toHaveBeenCalledTimes(1);
      expect(geoMock.geocode).toHaveBeenCalledWith(validDto.origin);
      expect(prismaMock.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: userId,
          origin: validDto.origin,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destination: campusLabel,
          destinationLat: campusCoords.lat,
          destinationLng: campusCoords.lng,
          campusId: 'ua-pilar',
          routeDirection: 'TO_CAMPUS',
          departureTime: new Date(validDto.departureTime),
          arrivalTime: new Date(validDto.arrivalTime),
          capacity: 3,
        },
        include: { passengers: true },
      });
    });

    it('en la vuelta la sede es el origen y la casa es el destino', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      geoMock.geocode.mockResolvedValue(destinationCoords);
      prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' });

      await service.create(userId, {
        ...validDto,
        routeDirection: 'FROM_CAMPUS',
      });

      expect(geoMock.geocode).toHaveBeenCalledWith(validDto.destination);
      expect(prismaMock.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: userId,
          origin: campusLabel,
          originLat: campusCoords.lat,
          originLng: campusCoords.lng,
          destination: validDto.destination,
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng,
          campusId: 'ua-pilar',
          routeDirection: 'FROM_CAMPUS',
          departureTime: new Date(validDto.departureTime),
          arrivalTime: new Date(validDto.arrivalTime),
          capacity: 3,
        },
        include: { passengers: true },
      });
    });

    it('ignora el texto escrito para el extremo de la universidad', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' });

      await service.create(userId, {
        ...validDto,
        destination: 'Cualquier cosa',
      });

      expect(geoMock.geocode).not.toHaveBeenCalledWith('Cualquier cosa');
      expect(prismaMock.trip.create).toHaveBeenCalledTimes(1);
      const [{ data }] = prismaMock.trip.create.mock.calls[0] as [
        { data: { destination: string } },
      ];
      expect(data.destination).toBe(campusLabel);
    });

    it('responde 400 y no crea el viaje si la sede no existe', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      prismaMock.campus.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(geoMock.geocode).not.toHaveBeenCalled();
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('registra la publicación del viaje en las métricas', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      prismaMock.trip.create.mockResolvedValue({ id: 'trip-1' });

      await service.create(userId, validDto);

      expect(metricsMock.increment).toHaveBeenCalledWith(
        'trips_published',
        1,
        prismaMock,
      );
      expect(metricsMock.recordEvents).toHaveBeenCalledWith(
        [{ type: 'TRIP_PUBLISHED', refId: 'trip-1', userId }],
        prismaMock,
      );
    });

    it('guarda capacidad 0 si hasCar es true pero availableSeats es null', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: null,
      });
      prismaMock.trip.create.mockResolvedValue({
        id: 'trip-1',
        ...validDto,
        capacity: 0,
      });

      await service.create(userId, validDto);

      const [{ data }] = prismaMock.trip.create.mock.calls[0] as [
        { data: { capacity: number } },
      ];
      expect(data.capacity).toBe(0);
    });

    it('responde 400 y no crea el viaje si el origen no se puede resolver', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      geoMock.geocode.mockImplementation((address: string) =>
        Promise.resolve(address === validDto.origin ? null : destinationCoords),
      );

      await expect(service.create(userId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('responde 400 y no crea el viaje si la casa (destino en la vuelta) no se puede resolver', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      geoMock.geocode.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          ...validDto,
          routeDirection: 'FROM_CAMPUS',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('ejecuta el matching del viaje recién publicado', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      prismaMock.trip.create.mockResolvedValue({
        id: 'trip-1',
        ...validDto,
        capacity: 3,
      });

      await service.create(userId, validDto);

      expect(matchingMock.matchTrip).toHaveBeenCalledWith('trip-1');
    });

    it('no ejecuta el matching si el viaje no se publica', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: false,
        availableSeats: null,
      });

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(matchingMock.matchTrip).not.toHaveBeenCalled();
    });
  });

  describe('findUpcoming', () => {
    it('incluye los viajes de todos los usuarios, también los propios', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
      prismaMock.trip.findMany.mockResolvedValue([]);

      await service.findUpcoming('user-123');

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: { departureTime: { gt: new Date('2026-10-01T12:00:00.000Z') } },
        orderBy: { departureTime: 'asc' },
        include: {
          driver: { select: { id: true, email: true } },
          passengers: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      });

      jest.useRealTimers();
    });

    it('calcula availableSeats, isDriver e isParticipant para cada viaje devuelto', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-1',
          driverId: 'otro-driver',
          driver: { id: 'otro-driver' },
          capacity: 3,
          passengers: [{ userId: 'user-123', user: { id: 'user-123' } }],
        },
        {
          id: 'trip-2',
          driverId: 'otro-driver',
          driver: { id: 'otro-driver' },
          capacity: 2,
          passengers: [],
        },
        {
          id: 'trip-3',
          driverId: 'user-123',
          driver: { id: 'user-123' },
          capacity: 4,
          passengers: [{ userId: 'otro-user', user: { id: 'otro-user' } }],
        },
      ]);

      const result = await service.findUpcoming('user-123');

      expect(result[0].availableSeats).toBe(2);
      expect(result[0].isDriver).toBe(false);
      expect(result[0].isParticipant).toBe(true);
      expect(result[1].availableSeats).toBe(2);
      expect(result[1].isDriver).toBe(false);
      expect(result[1].isParticipant).toBe(false);
      expect(result[2].availableSeats).toBe(3);
      expect(result[2].isDriver).toBe(true);
      expect(result[2].isParticipant).toBe(true);
    });

    it('pide los nombres de todas las personas en una sola consulta', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-1',
          driverId: 'driver-1',
          driver: { id: 'driver-1' },
          capacity: 3,
          passengers: [{ userId: 'pasajero-1', user: { id: 'pasajero-1' } }],
        },
        {
          id: 'trip-2',
          driverId: 'driver-2',
          driver: { id: 'driver-2' },
          capacity: 3,
          passengers: [],
        },
      ]);

      await service.findUpcoming('user-123');

      expect(displayNamesMock.getPublicUsers).toHaveBeenCalledTimes(1);
      expect(displayNamesMock.getPublicUsers).toHaveBeenCalledWith([
        'driver-1',
        'pasajero-1',
        'driver-2',
      ]);
    });
  });

  describe('findMine', () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const include = {
      driver: { select: { id: true, email: true } },
      passengers: {
        include: { user: { select: { id: true, email: true } } },
      },
    };
    const participantFilter = [
      { driverId: userId },
      { passengers: { some: { userId } } },
    ];

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(now);
      prismaMock.trip.findMany.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('devuelve por defecto los próximos viajes en los que participa', async () => {
      await service.findMine(userId);

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: { departureTime: { gt: now }, OR: participantFilter },
        orderBy: [{ departureTime: 'asc' }, { id: 'asc' }],
        include,
      });
    });

    it('con scope history devuelve los que ya salieron, del más reciente al más viejo', async () => {
      await service.findMine(userId, 'history');

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: { departureTime: { lte: now }, OR: participantFilter },
        orderBy: [{ departureTime: 'desc' }, { id: 'asc' }],
        include,
      });
    });

    it('marca como histórico un viaje que ya salió', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        {
          id: 'trip-1',
          driverId: userId,
          capacity: 3,
          passengers: [],
          departureTime: new Date('2026-10-14T11:00:00.000Z'),
          driver: { id: userId },
        },
        {
          id: 'trip-2',
          driverId: userId,
          capacity: 3,
          passengers: [],
          departureTime: new Date('2026-10-14T13:00:00.000Z'),
          driver: { id: userId },
        },
      ]);

      const result = await service.findMine(userId, 'history');

      expect(result[0].isHistorical).toBe(true);
      expect(result[1].isHistorical).toBe(false);
    });

    it('pagina con limit y offset cuando se piden', async () => {
      await service.findMine(userId, 'upcoming', { limit: 20, offset: 40 });

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: { departureTime: { gt: now }, OR: participantFilter },
        orderBy: [{ departureTime: 'asc' }, { id: 'asc' }],
        take: 20,
        skip: 40,
        include,
      });
    });
  });

  describe('findOneOrThrow', () => {
    const driverId = 'driver-1';
    const baseTrip = {
      id: 'trip-1',
      driverId,
      origin: 'Pilar',
      destination: 'Palermo',
      capacity: 3,
      driver: { id: driverId, email: 'driver@test.com' },
    };

    it('devuelve el viaje con availableSeats e isParticipant en false si no participa', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [
          {
            userId: 'otro-user',
            user: { id: 'otro-user', email: 'otro@test.com' },
          },
        ],
      });

      const result = await service.findOneOrThrow('trip-1', 'user-ajeno');

      expect(result.availableSeats).toBe(2);
      expect(result.isParticipant).toBe(false);
    });

    it('marca isParticipant true cuando el usuario es pasajero', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [
          {
            userId: 'user-123',
            user: { id: 'user-123', email: 'yo@test.com' },
          },
        ],
      });

      const result = await service.findOneOrThrow('trip-1', 'user-123');

      expect(result.isDriver).toBe(false);
      expect(result.isParticipant).toBe(true);
      expect(result.availableSeats).toBe(2);
    });

    it('marca isDriver e isParticipant true cuando el usuario es el conductor', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });

      const result = await service.findOneOrThrow('trip-1', driverId);

      expect(result.isDriver).toBe(true);
      expect(result.isParticipant).toBe(true);
      expect(result.availableSeats).toBe(3);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneOrThrow('trip-1', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    describe('ubicación de los pasajeros', () => {
      const location = {
        pickupAddress: 'Pilar',
        pickupLat: -34.45,
        pickupLng: -58.91,
        dropoffAddress: 'Palermo',
        dropoffLat: -34.58,
        dropoffLng: -58.43,
      };
      const passengers = [
        {
          userId: 'pasajero-1',
          user: { id: 'pasajero-1', email: 'uno@test.com' },
          ...location,
        },
        {
          userId: 'pasajero-2',
          user: { id: 'pasajero-2', email: 'dos@test.com' },
          ...location,
        },
      ];

      beforeEach(() => {
        prismaMock.trip.findUnique.mockResolvedValue({
          ...baseTrip,
          passengers,
        });
      });

      it('el conductor ve la ubicación de todos los pasajeros', async () => {
        const result = await service.findOneOrThrow('trip-1', driverId);

        expect(result.passengers[0].pickupAddress).toBe('Pilar');
        expect(result.passengers[1].dropoffAddress).toBe('Palermo');
      });

      it('cada pasajero ve la ubicación de todos los pasajeros', async () => {
        const result = await service.findOneOrThrow('trip-1', 'pasajero-1');

        expect(result.passengers[0].pickupAddress).toBe('Pilar');
        expect(result.passengers[1].pickupAddress).toBe('Pilar');
        expect(result.passengers[1].dropoffLat).toBe(-34.58);
      });

      it('un usuario ajeno al viaje no ve ninguna ubicación', async () => {
        const result = await service.findOneOrThrow('trip-1', 'ajeno');

        expect(result.passengers[0].pickupAddress).toBeNull();
        expect(result.passengers[1].pickupLng).toBeNull();
      });
    });

    it('agrega el displayName y la foto del conductor y de cada pasajero', async () => {
      displayNamesMock.getPublicUsers.mockResolvedValue(
        new Map([
          [driverId, { displayName: 'Ana Pérez', photoUrl: 'https://foto/d1' }],
          ['pasajero-1', { displayName: 'Luis Gómez', photoUrl: null }],
        ]),
      );
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [
          {
            userId: 'pasajero-1',
            user: { id: 'pasajero-1', email: 'uno@test.com' },
          },
          {
            userId: 'pasajero-2',
            user: { id: 'pasajero-2', email: 'dos@test.com' },
          },
        ],
      });

      const result = await service.findOneOrThrow('trip-1', 'user-ajeno');

      expect(result.driver.displayName).toBe('Ana Pérez');
      expect(result.passengers[0].user.displayName).toBe('Luis Gómez');
      expect(result.passengers[1].user.displayName).toBeNull();
      expect(result.driver.photoUrl).toBe('https://foto/d1');
      expect(result.passengers[0].user.photoUrl).toBeNull();
      expect(result.passengers[1].user.photoUrl).toBeNull();
    });

    describe('datos del conductor', () => {
      const driverProfile = {
        carModel: 'Toyota Corolla',
        carColor: 'Blanco',
        phone: '+5491122334455',
      };

      beforeEach(() => {
        prismaMock.trip.findUnique.mockResolvedValue({
          ...baseTrip,
          driver: { ...baseTrip.driver, studentProfile: driverProfile },
          passengers: [
            {
              userId: 'user-123',
              user: { id: 'user-123', email: 'yo@test.com' },
            },
          ],
        });
      });

      it('pide el teléfono y los datos del auto del conductor', async () => {
        await service.findOneOrThrow('trip-1', driverId);

        expect(prismaMock.trip.findUnique).toHaveBeenCalledWith({
          where: { id: 'trip-1' },
          include: {
            driver: {
              select: {
                id: true,
                email: true,
                studentProfile: {
                  select: { carModel: true, carColor: true, phone: true },
                },
              },
            },
            passengers: {
              include: { user: { select: { id: true, email: true } } },
            },
          },
        });
      });

      it('el conductor ve el teléfono y los datos del auto', async () => {
        const result = await service.findOneOrThrow('trip-1', driverId);

        expect(result.driver.studentProfile).toEqual(driverProfile);
      });

      it('un pasajero del viaje ve el teléfono y los datos del auto del conductor', async () => {
        const result = await service.findOneOrThrow('trip-1', 'user-123');

        expect(result.driver.studentProfile).toEqual(driverProfile);
      });

      it('quien no participa del viaje no ve el teléfono ni los datos del auto', async () => {
        const result = await service.findOneOrThrow('trip-1', 'user-ajeno');

        expect(result.driver.studentProfile).toBeNull();
      });
    });
  });

  describe('update', () => {
    const tripId = 'trip-1';
    const existingTrip = {
      id: tripId,
      driverId: userId,
      origin: 'Pilar',
      originLat: originCoords.lat,
      originLng: originCoords.lng,
      destination: 'Palermo',
      destinationLat: destinationCoords.lat,
      destinationLng: destinationCoords.lng,
      departureTime: new Date('2026-10-05T08:00:00.000Z'),
      arrivalTime: new Date('2026-10-05T09:00:00.000Z'),
      capacity: 3,
      driver: { id: userId, email: 'conductor@test.com' },
      campusId: null,
      routeDirection: null,
    };
    const newCoords = { lat: -34.42, lng: -58.58 };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
      prismaMock.trip.findUnique.mockResolvedValue(existingTrip);
      prismaMock.trip.update.mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...existingTrip, ...data, passengers: [] }),
      );
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const updateData = () =>
      (prismaMock.trip.update.mock.calls[0] as [{ data: object }])[0].data;

    it('no vuelve a geocodificar si las direcciones no cambian', async () => {
      await service.update(tripId, userId, {
        origin: 'Pilar',
        departureTime: '2026-10-05T07:30:00.000Z',
      });

      expect(geoMock.geocode).not.toHaveBeenCalled();
      expect(updateData()).not.toHaveProperty('originLat');
      expect(updateData()).not.toHaveProperty('destinationLat');
    });

    it('recalcula solo las coordenadas de la dirección que cambió', async () => {
      geoMock.geocode.mockResolvedValue(newCoords);

      await service.update(tripId, userId, { origin: 'Tigre' });

      expect(geoMock.geocode).toHaveBeenCalledTimes(1);
      expect(geoMock.geocode).toHaveBeenCalledWith('Tigre');
      expect(updateData()).toMatchObject({
        origin: 'Tigre',
        originLat: newCoords.lat,
        originLng: newCoords.lng,
      });
      expect(updateData()).not.toHaveProperty('destinationLat');
    });

    it('geocodifica viajes viejos sin coordenadas aunque la dirección no cambie', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...existingTrip,
        destinationLat: null,
        destinationLng: null,
      });
      geoMock.geocode.mockResolvedValue(newCoords);

      await service.update(tripId, userId, {});

      expect(geoMock.geocode).toHaveBeenCalledWith('Palermo');
      expect(updateData()).toMatchObject({
        destinationLat: newCoords.lat,
        destinationLng: newCoords.lng,
      });
    });

    it('responde 400 y no actualiza si la nueva dirección no se resuelve', async () => {
      geoMock.geocode.mockResolvedValue(null);

      await expect(
        service.update(tripId, userId, { destination: 'asdfgh' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('responde 400 si la llegada queda antes que la salida actual', async () => {
      await expect(
        service.update(tripId, userId, {
          arrivalTime: '2026-10-05T07:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el viaje no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(service.update(tripId, userId, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza a quien no es el conductor', async () => {
      await expect(
        service.update(tripId, 'otro-user', { origin: 'Tigre' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('rechaza editar un viaje que ya salió', async () => {
      jest.setSystemTime(new Date('2026-10-05T08:30:00.000Z'));

      await expect(
        service.update(tripId, userId, { origin: 'Tigre' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.trip.update).not.toHaveBeenCalled();
    });

    it('re-ejecuta el matching del viaje después de editarlo', async () => {
      await service.update(tripId, userId, { origin: 'Pilar' });

      expect(matchingMock.matchTrip).toHaveBeenCalledWith(tripId);
    });

    describe('viajes con sede', () => {
      const tripWithCampus = {
        ...existingTrip,
        destination: campusLabel,
        destinationLat: campusCoords.lat,
        destinationLng: campusCoords.lng,
        campusId: 'ua-pilar',
        routeDirection: 'TO_CAMPUS',
      };

      beforeEach(() => {
        prismaMock.trip.findUnique.mockResolvedValue(tripWithCampus);
      });

      it('conserva sede y direcciones sin geocodificar si solo cambia el horario', async () => {
        await service.update(tripId, userId, {
          departureTime: '2026-10-05T07:30:00.000Z',
        });

        expect(geoMock.geocode).not.toHaveBeenCalled();
        expect(updateData()).toMatchObject({
          campusId: 'ua-pilar',
          routeDirection: 'TO_CAMPUS',
          origin: 'Pilar',
          destination: campusLabel,
        });
      });

      it('al cambiar de sede, el extremo de la universidad usa las coordenadas de la nueva sede', async () => {
        prismaMock.campus.findUnique.mockResolvedValue({
          id: 'uba-paternal',
          name: 'Sede Paternal',
          latitude: -34.5934,
          longitude: -58.4855,
          university: { id: 'uba', name: 'Universidad de Buenos Aires' },
        });

        await service.update(tripId, userId, { campusId: 'uba-paternal' });

        expect(geoMock.geocode).not.toHaveBeenCalled();
        expect(updateData()).toMatchObject({
          campusId: 'uba-paternal',
          destination: 'Universidad de Buenos Aires - Sede Paternal',
          destinationLat: -34.5934,
          destinationLng: -58.4855,
          origin: 'Pilar',
          originLat: originCoords.lat,
          originLng: originCoords.lng,
        });
      });

      it('al invertir el recorrido, la casa pasa al otro extremo sin geocodificar de nuevo', async () => {
        await service.update(tripId, userId, {
          routeDirection: 'FROM_CAMPUS',
        });

        expect(geoMock.geocode).not.toHaveBeenCalled();
        expect(updateData()).toMatchObject({
          routeDirection: 'FROM_CAMPUS',
          origin: campusLabel,
          originLat: campusCoords.lat,
          originLng: campusCoords.lng,
          destination: 'Pilar',
          destinationLat: originCoords.lat,
          destinationLng: originCoords.lng,
        });
      });

      it('ignora el texto escrito para el extremo de la universidad', async () => {
        await service.update(tripId, userId, { destination: 'Otro lado' });

        expect(geoMock.geocode).not.toHaveBeenCalled();
        expect(updateData()).toMatchObject({ destination: campusLabel });
      });

      it('geocodifica la casa solo si su dirección cambió', async () => {
        geoMock.geocode.mockResolvedValue(newCoords);

        await service.update(tripId, userId, { origin: 'Tigre' });

        expect(geoMock.geocode).toHaveBeenCalledTimes(1);
        expect(geoMock.geocode).toHaveBeenCalledWith('Tigre');
        expect(updateData()).toMatchObject({
          origin: 'Tigre',
          originLat: newCoords.lat,
          originLng: newCoords.lng,
          destination: campusLabel,
        });
      });

      it('rechaza una sede que no existe', async () => {
        prismaMock.campus.findUnique.mockResolvedValue(null);

        await expect(
          service.update(tripId, userId, { campusId: 'no-existe' }),
        ).rejects.toThrow(BadRequestException);
        expect(prismaMock.trip.update).not.toHaveBeenCalled();
      });

      it('re-ejecuta el matching después de cambiar de sede', async () => {
        await service.update(tripId, userId, { campusId: 'ua-pilar' });

        expect(matchingMock.matchTrip).toHaveBeenCalledWith(tripId);
      });
    });

    describe('viajes anteriores al catálogo', () => {
      it('rechaza mandar solo la sede, sin la dirección del recorrido', async () => {
        await expect(
          service.update(tripId, userId, { campusId: 'ua-pilar' }),
        ).rejects.toThrow(BadRequestException);
        expect(prismaMock.trip.update).not.toHaveBeenCalled();
      });

      it('les asigna sede y dirección sin geocodificar si la casa no cambió', async () => {
        await service.update(tripId, userId, {
          campusId: 'ua-pilar',
          routeDirection: 'TO_CAMPUS',
        });

        expect(geoMock.geocode).not.toHaveBeenCalled();
        expect(updateData()).toMatchObject({
          campusId: 'ua-pilar',
          routeDirection: 'TO_CAMPUS',
          origin: 'Pilar',
          destination: campusLabel,
        });
      });
    });
  });

  describe('join', () => {
    const driverId = 'driver-1';
    const tripId = 'trip-1';
    const baseTrip = {
      id: tripId,
      driverId,
      departureTime: new Date('2026-10-05T08:00:00.000Z'),
      arrivalTime: new Date('2026-10-05T09:00:00.000Z'),
      capacity: 2,
    };

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('lanza NotFoundException si el viaje no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza al conductor que intenta sumarse a su propio viaje', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });

      await expect(service.join(tripId, driverId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza si el usuario ya participa del viaje', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [{ userId: 'user-123' }],
      });

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });

    it('rechaza si no quedan lugares disponibles', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        capacity: 1,
        passengers: [{ userId: 'otro-user' }],
      });

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.tripPassenger.create).not.toHaveBeenCalled();
    });

    it('rechaza si se solapa con otro viaje del usuario (como pasajero o conductor)', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });
      prismaMock.trip.findFirst.mockResolvedValue({ id: 'otro-trip' });

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.tripPassenger.create).not.toHaveBeenCalled();
    });

    it('suma al usuario como pasajero cuando todo es valido', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });
      prismaMock.trip.findFirst.mockResolvedValue(null);
      const created = { id: 'passenger-1', tripId, userId: 'user-123' };
      prismaMock.tripPassenger.create.mockResolvedValue(created);

      const result = await service.join(tripId, 'user-123');

      expect(result).toEqual(created);
      expect(prismaMock.tripPassenger.create).toHaveBeenCalledWith({
        data: { tripId, userId: 'user-123' },
      });
    });

    it('convierte un conflicto de transaccion (P2034) en ConflictException', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });
      prismaMock.trip.findFirst.mockResolvedValue(null);
      prismaMock.tripPassenger.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('conflict', {
          code: 'P2034',
          clientVersion: '7.9.1',
        }),
      );

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        ConflictException,
      );
    });
    it('re-ejecuta el matching del viaje después de sumarse', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });
      prismaMock.trip.findFirst.mockResolvedValue(null);
      prismaMock.tripPassenger.create.mockResolvedValue({
        id: 'passenger-1',
        tripId,
        userId: 'user-123',
      });

      await service.join(tripId, 'user-123');

      expect(matchingMock.matchTrip).toHaveBeenCalledWith(tripId);
    });

    it('no ejecuta el matching si no pudo sumarse', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        NotFoundException,
      );
      expect(matchingMock.matchTrip).not.toHaveBeenCalled();
    });

    it('rechaza sumarse a un viaje que ya salió', async () => {
      jest.setSystemTime(new Date('2026-10-05T08:30:00.000Z'));
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });

      await expect(service.join(tripId, 'user-123')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.tripPassenger.create).not.toHaveBeenCalled();
      expect(matchingMock.matchTrip).not.toHaveBeenCalled();
    });
  });

  describe('leave', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('rechaza salir de un viaje que ya salió', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-05T08:30:00.000Z'));
      prismaMock.trip.findUnique.mockResolvedValue({
        departureTime: new Date('2026-10-05T08:00:00.000Z'),
      });

      await expect(service.leave('trip-1', 'user-123')).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.tripPassenger.deleteMany).not.toHaveBeenCalled();
    });

    it('elimina la participacion cuando existe', async () => {
      prismaMock.tripPassenger.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.leave('trip-1', 'user-123'),
      ).resolves.toBeUndefined();
      expect(prismaMock.tripPassenger.deleteMany).toHaveBeenCalledWith({
        where: { tripId: 'trip-1', userId: 'user-123' },
      });
    });

    it('lanza NotFoundException si no participaba', async () => {
      prismaMock.tripPassenger.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.leave('trip-1', 'user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
    it('re-ejecuta el matching del viaje después de salir', async () => {
      prismaMock.tripPassenger.deleteMany.mockResolvedValue({ count: 1 });

      await service.leave('trip-1', 'user-123');

      expect(matchingMock.matchTrip).toHaveBeenCalledWith('trip-1');
    });
  });
});
