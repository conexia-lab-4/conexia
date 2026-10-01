import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

describe('TripsService', () => {
  let service: TripsService;
  let prismaMock: {
    studentProfile: { findUnique: jest.Mock };
    trip: { create: jest.Mock; findUnique: jest.Mock };
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
      trip: { create: jest.fn(), findUnique: jest.fn() },
    };
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
});
