import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { MatchingService } from '../matching/matching.service';
import { PrismaService } from '../prisma/prisma.service';
import { TravelMatchesService } from './travel-matches.service';

describe('TravelMatchesService', () => {
  let service: TravelMatchesService;
  let prismaMock: {
    travelMatch: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    travelIntent: { update: jest.Mock };
    trip: { findUnique: jest.Mock; findFirst: jest.Mock };
    tripPassenger: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let matchingMock: { matchTrip: jest.Mock };

  const userId = 'pasajero-1';
  const future = new Date('2026-10-05T09:00:00.000Z');

  const openTrip = {
    id: 'trip-1',
    driverId: 'driver-1',
    departureTime: new Date('2026-10-05T08:00:00.000Z'),
    arrivalTime: future,
    capacity: 3,
    passengers: [] as { userId: string }[],
  };

  function buildMatch(overrides: Record<string, unknown> = {}) {
    return {
      id: 'match-1',
      tripId: 'trip-1',
      travelIntentId: 'intent-1',
      status: 'SUGGESTED',
      trip: { id: 'trip-1', arrivalTime: future },
      travelIntent: {
        id: 'intent-1',
        userId,
        status: 'ACTIVE',
        arrivalTime: future,
      },
      ...overrides,
    };
  }

  function expectNoWrites() {
    expect(prismaMock.tripPassenger.create).not.toHaveBeenCalled();
    expect(prismaMock.travelIntent.update).not.toHaveBeenCalled();
    expect(prismaMock.travelMatch.update).not.toHaveBeenCalled();
    expect(prismaMock.travelMatch.updateMany).not.toHaveBeenCalled();
    expect(matchingMock.matchTrip).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

    prismaMock = {
      travelMatch: {
        findUnique: jest.fn().mockResolvedValue(buildMatch()),
        update: jest.fn().mockResolvedValue({
          id: 'match-1',
          tripId: 'trip-1',
          status: 'ACCEPTED',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      travelIntent: { update: jest.fn() },
      trip: {
        findUnique: jest.fn().mockResolvedValue(openTrip),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      tripPassenger: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'p-1', tripId: 'trip-1', userId }),
      },
      $transaction: jest.fn(),
    };
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock),
    );
    matchingMock = { matchTrip: jest.fn().mockResolvedValue(undefined) };
    service = new TravelMatchesService(
      prismaMock as unknown as PrismaService,
      matchingMock as unknown as MatchingService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('acepta el match: suma al pasajero, cumple la intención e invalida los demás', async () => {
    const result = await service.accept('match-1', userId);

    expect(result).toEqual({
      id: 'match-1',
      tripId: 'trip-1',
      status: 'ACCEPTED',
    });
    expect(prismaMock.tripPassenger.create).toHaveBeenCalledWith({
      data: { tripId: 'trip-1', userId },
    });
    expect(prismaMock.travelIntent.update).toHaveBeenCalledWith({
      where: { id: 'intent-1' },
      data: { status: 'FULFILLED' },
    });
    expect(prismaMock.travelMatch.updateMany).toHaveBeenCalledWith({
      where: {
        travelIntentId: 'intent-1',
        id: { not: 'match-1' },
        status: 'SUGGESTED',
      },
      data: { status: 'INVALIDATED' },
    });
    expect(prismaMock.travelMatch.update).toHaveBeenCalledWith({
      where: { id: 'match-1' },
      data: { status: 'ACCEPTED' },
    });
  });

  it('recalcula las sugerencias del viaje después de aceptar', async () => {
    await service.accept('match-1', userId);

    expect(matchingMock.matchTrip).toHaveBeenCalledWith('trip-1');
  });

  it('responde 404 si el match no existe', async () => {
    prismaMock.travelMatch.findUnique.mockResolvedValue(null);

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      NotFoundException,
    );
    expectNoWrites();
  });

  it('responde 404 si el match es de la intención de otro usuario', async () => {
    await expect(service.accept('match-1', 'otro-usuario')).rejects.toThrow(
      NotFoundException,
    );
    expectNoWrites();
  });

  it('no permite aceptar dos veces la misma coincidencia', async () => {
    prismaMock.travelMatch.findUnique.mockResolvedValue(
      buildMatch({ status: 'ACCEPTED' }),
    );

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expectNoWrites();
  });

  it('rechaza un match INVALIDATED', async () => {
    prismaMock.travelMatch.findUnique.mockResolvedValue(
      buildMatch({ status: 'INVALIDATED' }),
    );

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expectNoWrites();
  });

  it.each(['FULFILLED', 'CANCELLED', 'EXPIRED'])(
    'rechaza si la intención está %s',
    async (status) => {
      prismaMock.travelMatch.findUnique.mockResolvedValue(
        buildMatch({
          travelIntent: {
            id: 'intent-1',
            userId,
            status,
            arrivalTime: future,
          },
        }),
      );

      await expect(service.accept('match-1', userId)).rejects.toThrow(
        ConflictException,
      );
      expectNoWrites();
    },
  );

  it('rechaza si el viaje ya finalizó', async () => {
    prismaMock.travelMatch.findUnique.mockResolvedValue(
      buildMatch({
        trip: {
          id: 'trip-1',
          arrivalTime: new Date('2026-09-30T09:00:00.000Z'),
        },
      }),
    );

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expectNoWrites();
  });

  it('rechaza si el viaje ya no tiene lugares', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      ...openTrip,
      capacity: 1,
      passengers: [{ userId: 'otro' }],
    });

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expectNoWrites();
  });

  it('rechaza si el pasajero ya tiene otro viaje que se solapa', async () => {
    prismaMock.trip.findFirst.mockResolvedValue({ id: 'otro-viaje' });

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expectNoWrites();
  });

  it('convierte un conflicto de concurrencia (P2034) en ConflictException', async () => {
    prismaMock.tripPassenger.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conflict', {
        code: 'P2034',
        clientVersion: '7.9.1',
      }),
    );

    await expect(service.accept('match-1', userId)).rejects.toThrow(
      ConflictException,
    );
    expect(matchingMock.matchTrip).not.toHaveBeenCalled();
  });
});
