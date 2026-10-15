import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MatchingService } from './matching.service';
import { MetricsService } from '../metrics/metrics.service';

interface TripFixture {
  id: string;
  driverId: string;
  origin: string;
  destination: string;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
  departureTime: Date;
  arrivalTime: Date;
  capacity: number;
  passengers: { userId: string }[];
  driver: { studentProfile: { detourToleranceKm: number | null } | null };
}

interface IntentFixture {
  id: string;
  userId: string;
  status: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  departureTime: Date;
  arrivalTime: Date;
}

function buildTrip(overrides: Partial<TripFixture> = {}): TripFixture {
  return {
    id: 'trip-1',
    driverId: 'driver-1',
    origin: 'Pilar',
    destination: 'Palermo',
    originLat: -34.45,
    originLng: -58.91,
    destinationLat: -34.58,
    destinationLng: -58.43,
    departureTime: new Date('2026-10-05T08:00:00.000Z'),
    arrivalTime: new Date('2026-10-05T09:00:00.000Z'),
    capacity: 3,
    passengers: [],
    driver: { studentProfile: { detourToleranceKm: 10 } },
    ...overrides,
  };
}

function buildIntent(overrides: Partial<IntentFixture> = {}): IntentFixture {
  return {
    id: 'intent-1',
    userId: 'pasajero-1',
    status: 'ACTIVE',
    originLat: -34.4,
    originLng: -58.8,
    destinationLat: -34.5,
    destinationLng: -58.5,
    departureTime: new Date('2026-10-05T08:15:00.000Z'),
    arrivalTime: new Date('2026-10-05T09:00:00.000Z'),
    ...overrides,
  };
}

describe('MatchingService', () => {
  let service: MatchingService;
  let prismaMock: {
    trip: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    travelIntent: { findUnique: jest.Mock; findMany: jest.Mock };
    travelMatch: {
      findMany: jest.Mock;
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  let metricsMock: { increment: jest.Mock; recordEvents: jest.Mock };

  // La primera llamada es la ruta directa del conductor y la segunda la ruta
  // pasando por el pasajero
  function mockRoutes(directKm: number, withPassengerKm: number) {
    geoMock.getRouteDistanceKm
      .mockResolvedValueOnce(directKm)
      .mockResolvedValueOnce(withPassengerKm);
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    prismaMock = {
      trip: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      travelIntent: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      travelMatch: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    metricsMock = {
      increment: jest.fn(),
      recordEvents: jest.fn().mockResolvedValue(1),
    };
    geoMock = { geocode: jest.fn(), getRouteDistanceKm: jest.fn() };
    service = new MatchingService(
      prismaMock as unknown as PrismaService,
      geoMock,
      metricsMock as unknown as MetricsService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('matchTrip', () => {
    it('persiste un match SUGGESTED con las métricas calculadas', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).toHaveBeenCalledWith({
        where: {
          tripId_travelIntentId: {
            tripId: 'trip-1',
            travelIntentId: 'intent-1',
          },
        },
        create: {
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          score: 78,
          detourKm: 2,
          departureDeltaMinutes: 15,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
        update: {
          score: 78,
          detourKm: 2,
          departureDeltaMinutes: 15,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
      });
    });

    it('descarta sin consultar rutas si la salida difiere más de 30 minutos', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([
        buildIntent({
          departureTime: new Date('2026-10-05T08:45:00.000Z'),
        }),
      ]);

      await service.matchTrip('trip-1');

      expect(geoMock.getRouteDistanceKm).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('descarta si no quedan lugares disponibles', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(
        buildTrip({ capacity: 1, passengers: [{ userId: 'otro' }] }),
      );
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);

      await service.matchTrip('trip-1');

      expect(geoMock.getRouteDistanceKm).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('descarta si pasajero y conductor son la misma persona', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([
        buildIntent({ userId: 'driver-1' }),
      ]);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('descarta si el pasajero tiene otro viaje que se solapa', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      prismaMock.trip.findMany.mockResolvedValue([
        {
          driverId: 'otro-conductor',
          departureTime: new Date('2026-10-05T08:30:00.000Z'),
          arrivalTime: new Date('2026-10-05T09:30:00.000Z'),
          passengers: [{ userId: 'pasajero-1' }],
        },
      ]);

      await service.matchTrip('trip-1');

      expect(geoMock.getRouteDistanceKm).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('descarta si el desvío supera la tolerancia del conductor', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      mockRoutes(10, 21);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('con tolerancia sin configurar, un desvío de 4 metros cuenta como 0', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(
        buildTrip({ driver: { studentProfile: null } }),
      );
      prismaMock.travelIntent.findMany.mockResolvedValue([
        buildIntent({
          departureTime: new Date('2026-10-05T08:00:00.000Z'),
        }),
      ]);
      mockRoutes(10, 10.004);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).toHaveBeenCalledWith({
        where: {
          tripId_travelIntentId: {
            tripId: 'trip-1',
            travelIntentId: 'intent-1',
          },
        },
        create: {
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          score: 100,
          detourKm: 0,
          departureDeltaMinutes: 0,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
        update: {
          score: 100,
          detourKm: 0,
          departureDeltaMinutes: 0,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
      });
    });

    it('geocodifica de nuevo un viaje sin coordenadas y las guarda', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(
        buildTrip({
          originLat: null,
          originLng: null,
          destinationLat: null,
          destinationLng: null,
        }),
      );
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      geoMock.geocode.mockResolvedValue({ lat: -34.4, lng: -58.9 });
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(prismaMock.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: {
          originLat: -34.4,
          originLng: -58.9,
          destinationLat: -34.4,
          destinationLng: -58.9,
        },
      });
      expect(prismaMock.travelMatch.upsert).toHaveBeenCalledTimes(1);
    });

    it('no genera matches ni toca el viaje si sus direcciones no se ubican', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(
        buildTrip({
          originLat: null,
          originLng: null,
          destinationLat: null,
          destinationLng: null,
        }),
      );
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      geoMock.geocode.mockResolvedValue(null);

      await service.matchTrip('trip-1');

      expect(prismaMock.trip.update).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
    });

    it('invalida las sugerencias que ya no se cumplen', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([]);
      prismaMock.travelMatch.findMany.mockResolvedValue([
        {
          id: 'match-viejo',
          tripId: 'trip-1',
          travelIntentId: 'intent-viejo',
          status: 'SUGGESTED',
        },
      ]);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['match-viejo'] } },
        data: { status: 'INVALIDATED' },
      });
    });

    it('no modifica un match ya ACCEPTED', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      prismaMock.travelMatch.findMany.mockResolvedValue([
        {
          id: 'match-1',
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          status: 'ACCEPTED',
        },
      ]);
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.updateMany).not.toHaveBeenCalled();
    });

    it('no modifica un match ya REJECTED', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      prismaMock.travelMatch.findMany.mockResolvedValue([
        {
          id: 'match-1',
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          status: 'REJECTED',
        },
      ]);
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.updateMany).not.toHaveBeenCalled();
    });

    it('registra el match nuevo para el conductor y el pasajero y lo cuenta una vez', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(metricsMock.recordEvents).toHaveBeenCalledWith(
        [
          {
            type: 'MATCH_CREATED',
            refId: 'trip-1:intent-1',
            userId: 'driver-1',
          },
        ],
        prismaMock,
      );
      expect(metricsMock.recordEvents).toHaveBeenCalledWith(
        [
          {
            type: 'MATCH_CREATED',
            refId: 'trip-1:intent-1',
            userId: 'pasajero-1',
          },
        ],
        prismaMock,
      );
      expect(metricsMock.increment).toHaveBeenCalledWith(
        'matches_created',
        1,
        prismaMock,
      );
    });

    it('no vuelve a contar un match que ya estaba registrado', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      metricsMock.recordEvents.mockResolvedValue(0);
      mockRoutes(10, 12);

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).toHaveBeenCalledTimes(1);
      expect(metricsMock.increment).toHaveBeenCalledWith(
        'matches_created',
        0,
        prismaMock,
      );
    });

    it('un error del proveedor de rutas no invalida un match existente', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());
      prismaMock.travelIntent.findMany.mockResolvedValue([buildIntent()]);
      prismaMock.travelMatch.findMany.mockResolvedValue([
        {
          id: 'match-1',
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          status: 'SUGGESTED',
        },
      ]);
      geoMock.getRouteDistanceKm.mockRejectedValue(new Error('timeout'));

      await service.matchTrip('trip-1');

      expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
      expect(prismaMock.travelMatch.updateMany).not.toHaveBeenCalled();
    });

    it('no lanza si falla la base de datos', async () => {
      prismaMock.trip.findUnique.mockRejectedValue(new Error('db caída'));

      await expect(service.matchTrip('trip-1')).resolves.toBeUndefined();
    });
    it('solo evalúa intenciones ACTIVE', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(buildTrip());

      await service.matchTrip('trip-1');

      expect(prismaMock.travelIntent.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          arrivalTime: { gt: new Date('2026-10-01T12:00:00.000Z') },
        },
      });
    });
  });

  describe('matchIntent', () => {
    it('evalúa los viajes abiertos y persiste el match', async () => {
      prismaMock.travelIntent.findUnique.mockResolvedValue(buildIntent());
      prismaMock.trip.findMany
        .mockResolvedValueOnce([buildTrip()])
        .mockResolvedValueOnce([]);
      mockRoutes(10, 12);

      await service.matchIntent('intent-1');

      expect(prismaMock.travelMatch.upsert).toHaveBeenCalledWith({
        where: {
          tripId_travelIntentId: {
            tripId: 'trip-1',
            travelIntentId: 'intent-1',
          },
        },
        create: {
          tripId: 'trip-1',
          travelIntentId: 'intent-1',
          score: 78,
          detourKm: 2,
          departureDeltaMinutes: 15,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
        update: {
          score: 78,
          detourKm: 2,
          departureDeltaMinutes: 15,
          arrivalDeltaMinutes: 0,
          algorithmVersion: 'deterministic-v1',
          status: 'SUGGESTED',
        },
      });
    });

    it.each(['CANCELLED', 'FULFILLED', 'EXPIRED'])(
      'no busca viajes si la intención está %s',
      async (status) => {
        prismaMock.travelIntent.findUnique.mockResolvedValue(
          buildIntent({ status }),
        );

        await service.matchIntent('intent-1');

        expect(prismaMock.trip.findMany).not.toHaveBeenCalled();
        expect(prismaMock.travelMatch.upsert).not.toHaveBeenCalled();
      },
    );
  });
});
