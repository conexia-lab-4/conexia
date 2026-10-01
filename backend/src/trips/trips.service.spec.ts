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
    it('devuelve el viaje cuando existe', async () => {
      const trip = { id: 'trip-1', origin: 'Pilar' };
      prismaMock.trip.findUnique.mockResolvedValue(trip);

      const result = await service.findOneOrThrow('trip-1');

      expect(result).toEqual(trip);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(service.findOneOrThrow('trip-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
