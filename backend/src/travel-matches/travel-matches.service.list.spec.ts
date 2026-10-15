import { MatchingService } from '../matching/matching.service';
import { MetricsService } from '../metrics/metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { TravelMatchesService } from './travel-matches.service';

describe('TravelMatchesService.findMine', () => {
  let service: TravelMatchesService;
  let prismaMock: {
    travelMatch: { updateMany: jest.Mock; findMany: jest.Mock };
  };
  const userId = 'pasajero-1';
  const now = new Date('2026-10-14T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    prismaMock = {
      travelMatch: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new TravelMatchesService(
      prismaMock as unknown as PrismaService,
      {} as unknown as MatchingService,
      {} as unknown as MetricsService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('invalida los pendientes cuyo viaje ya salió, antes de listar', async () => {
    await service.findMine(userId);

    expect(prismaMock.travelMatch.updateMany).toHaveBeenCalledWith({
      where: {
        status: 'SUGGESTED',
        travelIntent: { userId },
        trip: { departureTime: { lte: now } },
      },
      data: { status: 'INVALIDATED' },
    });
    expect(
      prismaMock.travelMatch.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(prismaMock.travelMatch.findMany.mock.invocationCallOrder[0]);
  });

  it('solo trae matches SUGGESTED de intenciones activas del usuario', async () => {
    await service.findMine(userId);

    const [args] = prismaMock.travelMatch.findMany.mock.calls[0] as [
      { where: unknown; orderBy: unknown },
    ];

    expect(args.where).toEqual({
      status: 'SUGGESTED',
      travelIntent: { userId, status: 'ACTIVE' },
    });
    expect(args.orderBy).toEqual([
      { score: 'desc' },
      { trip: { departureTime: 'asc' } },
      { id: 'asc' },
    ]);
  });

  it('calcula los asientos libres y expone solo los datos permitidos del conductor', async () => {
    prismaMock.travelMatch.findMany.mockResolvedValue([
      {
        id: 'match-1',
        status: 'SUGGESTED',
        score: 81.66,
        detourKm: 9.17,
        departureDeltaMinutes: 0,
        arrivalDeltaMinutes: 0,
        trip: {
          id: 'trip-1',
          origin: 'Pilar',
          destination: 'Palermo',
          departureTime: new Date('2026-10-20T11:00:00.000Z'),
          arrivalTime: new Date('2026-10-20T12:30:00.000Z'),
          capacity: 3,
          _count: { passengers: 1 },
          driver: {
            id: 'driver-1',
            email: 'conductor@test.com',
            studentProfile: {
              career: 'Medicina',
              year: 2,
              campus: 'Pilar',
              carModel: 'Corolla',
              carColor: 'Blanco',
            },
          },
        },
      },
    ]);

    const result = await service.findMine(userId);

    expect(result[0].trip.availableSeats).toBe(2);
    expect(result[0].trip).not.toHaveProperty('_count');
    expect(result[0].trip.driver).toEqual({
      id: 'driver-1',
      email: 'conductor@test.com',
      profile: {
        career: 'Medicina',
        year: 2,
        campus: 'Pilar',
        carModel: 'Corolla',
        carColor: 'Blanco',
      },
    });
  });
});
