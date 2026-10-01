import {
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
    };
    tripPassenger: { create: jest.Mock; deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  const userId = 'user-123';

  const validDto: CreateTripDto = {
    origin: 'Pilar',
    destination: 'Palermo',
    departureTime: '2026-10-05T08:00:00.000Z',
    arrivalTime: '2026-10-05T09:00:00.000Z',
  };

  beforeEach(() => {
    prismaMock = {
      studentProfile: { findUnique: jest.fn() },
      trip: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      tripPassenger: { create: jest.fn(), deleteMany: jest.fn() },
      $transaction: jest.fn(),
    };
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    service = new TripsService(prismaMock as unknown as PrismaService);
  });

  describe('create', () => {
    it('rechaza cuando el usuario no tiene perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no tiene auto', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: false,
        availableSeats: null,
      });

      await expect(service.create(userId, validDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.trip.create).not.toHaveBeenCalled();
    });

    it('publica el viaje usando los asientos disponibles del perfil como capacidad', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        hasCar: true,
        availableSeats: 3,
      });
      const created = { id: 'trip-1', ...validDto, capacity: 3 };
      prismaMock.trip.create.mockResolvedValue(created);

      const result = await service.create(userId, validDto);

      expect(result).toEqual(created);
      expect(prismaMock.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: userId,
          origin: validDto.origin,
          destination: validDto.destination,
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

      expect(prismaMock.trip.create).toHaveBeenCalledWith({
        data: {
          driverId: userId,
          origin: validDto.origin,
          destination: validDto.destination,
          departureTime: new Date(validDto.departureTime),
          arrivalTime: new Date(validDto.arrivalTime),
          capacity: 0,
        },
        include: { passengers: true },
      });
    });
  });

  describe('findUpcoming', () => {
    it('excluye los viajes publicados por el propio usuario', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
      prismaMock.trip.findMany.mockResolvedValue([]);

      await service.findUpcoming('user-123');

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith({
        where: {
          driverId: { not: 'user-123' },
          departureTime: { gt: new Date('2026-10-01T12:00:00.000Z') },
        },
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

    it('calcula availableSeats e isParticipant para cada viaje devuelto', async () => {
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
      ]);

      const result = await service.findUpcoming('user-123');

      expect(result[0].availableSeats).toBe(2);
      expect(result[0].isParticipant).toBe(true);
      expect(result[1].availableSeats).toBe(2);
      expect(result[1].isParticipant).toBe(false);
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

      expect(result.isParticipant).toBe(true);
      expect(result.availableSeats).toBe(2);
    });

    it('marca isParticipant true cuando el usuario es el conductor', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...baseTrip,
        passengers: [],
      });

      const result = await service.findOneOrThrow('trip-1', driverId);

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
