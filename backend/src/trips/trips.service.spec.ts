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
    $transaction: jest.Mock;
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  const userId = 'user-123';

  const validDto: CreateTripDto = {
    origin: 'Pilar',
    destination: 'Palermo',
    departureTime: '2026-10-05T08:00:00.000Z',
    arrivalTime: '2026-10-05T09:00:00.000Z',
  };

  const originCoords = { lat: -34.4587, lng: -58.9142 };
  const destinationCoords = { lat: -34.5889, lng: -58.4306 };

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
      $transaction: jest.fn(),
    };
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
    service = new TripsService(prismaMock as unknown as PrismaService, geoMock);
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

    it('publica el viaje con las coordenadas geocodificadas y los asientos del perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      const created = { id: 'trip-1', ...validDto, capacity: 3 };
      prismaMock.trip.create.mockResolvedValue(created);

      const result = await service.create(userId, validDto);

      expect(result).toEqual(created);
      expect(geoMock.geocode).toHaveBeenCalledWith(validDto.origin);
      expect(geoMock.geocode).toHaveBeenCalledWith(validDto.destination);
      expect(prismaMock.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: userId,
          origin: validDto.origin,
          originLat: originCoords.lat,
          originLng: originCoords.lng,
          destination: validDto.destination,
          destinationLat: destinationCoords.lat,
          destinationLng: destinationCoords.lng,
          departureTime: new Date(validDto.departureTime),
          arrivalTime: new Date(validDto.arrivalTime),
          capacity: 3,
        },
        include: { passengers: true },
      });
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

    it('responde 400 y no crea el viaje si el destino no se puede resolver', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      geoMock.geocode.mockImplementation((address: string) =>
        Promise.resolve(address === validDto.origin ? originCoords : null),
      );

      await expect(service.create(userId, validDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
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
          capacity: 3,
          passengers: [{ userId: 'user-123' }],
        },
        {
          id: 'trip-2',
          driverId: 'otro-driver',
          capacity: 2,
          passengers: [],
        },
        {
          id: 'trip-3',
          driverId: 'user-123',
          capacity: 4,
          passengers: [{ userId: 'otro-user' }],
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
  });

  describe('leave', () => {
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
  });
});
