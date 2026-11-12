import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { FuelPriceService } from './fuel-price.service';
import { FuelEstimateService, sumLegs } from './fuel-estimate.service';

describe('FuelEstimateService', () => {
  let service: FuelEstimateService;
  let prismaMock: { trip: { findUnique: jest.Mock; findMany: jest.Mock } };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };
  let pricesMock: { getPricePerLiterArs: jest.Mock };
  let consumption: string | undefined;

  const home = { lat: -34.32, lng: -59.0 };
  const campus = { lat: -34.45, lng: -58.86 };

  const leg = (
    id: string,
    routeDirection: 'TO_CAMPUS' | 'FROM_CAMPUS' | null,
    from = home,
    to = campus,
  ) => ({
    id,
    routeDirection,
    originLat: from.lat,
    originLng: from.lng,
    destinationLat: to.lat,
    destinationLng: to.lng,
  });

  beforeEach(() => {
    consumption = '8';
    prismaMock = { trip: { findUnique: jest.fn(), findMany: jest.fn() } };
    geoMock = { geocode: jest.fn(), getRouteDistanceKm: jest.fn() };
    pricesMock = { getPricePerLiterArs: jest.fn().mockResolvedValue(1500) };
    const config = { get: () => consumption };

    service = new FuelEstimateService(
      prismaMock as unknown as PrismaService,
      geoMock,
      pricesMock as unknown as FuelPriceService,
      config as unknown as ConfigService,
    );
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('estimateTrip', () => {
    it('estima un recorrido simple por ruta vial entre sus extremos', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(leg('t1', 'TO_CAMPUS'));
      geoMock.getRouteDistanceKm.mockResolvedValue(50);

      await expect(service.estimateTrip('t1')).resolves.toEqual({
        tripId: 't1',
        routeDirection: 'TO_CAMPUS',
        available: true,
        distanceKm: 50,
        consumptionLPer100Km: 8,
        pricePerLiterArs: 1500,
        liters: 4,
        costArs: 6000,
      });
      expect(geoMock.getRouteDistanceKm).toHaveBeenCalledWith([home, campus]);
    });

    it('responde 404 si el viaje no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);
      await expect(service.estimateTrip('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sin coordenadas no hay ruta ni se consulta al proveedor', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...leg('t1', null),
        originLat: null,
      });

      await expect(service.estimateTrip('t1')).resolves.toMatchObject({
        available: false,
        reason: 'NO_ROUTE',
        distanceKm: null,
      });
      expect(geoMock.getRouteDistanceKm).not.toHaveBeenCalled();
    });

    it('sin ruta vial la estimación no está disponible', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(leg('t1', 'TO_CAMPUS'));
      geoMock.getRouteDistanceKm.mockResolvedValue(null);

      await expect(service.estimateTrip('t1')).resolves.toMatchObject({
        available: false,
        reason: 'NO_ROUTE',
      });
    });

    it('si el proveedor de rutas falla no lanza: queda no disponible', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(leg('t1', 'TO_CAMPUS'));
      geoMock.getRouteDistanceKm.mockRejectedValue(
        new ServiceUnavailableException('No pudimos calcular la ruta'),
      );

      await expect(service.estimateTrip('t1')).resolves.toMatchObject({
        available: false,
        reason: 'NO_ROUTE',
      });
    });

    it('sin precio de Argly informa la distancia pero no el costo', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(leg('t1', 'TO_CAMPUS'));
      geoMock.getRouteDistanceKm.mockResolvedValue(50);
      pricesMock.getPricePerLiterArs.mockResolvedValue(null);

      const estimate = await service.estimateTrip('t1');
      expect(estimate).toEqual({
        tripId: 't1',
        routeDirection: 'TO_CAMPUS',
        available: false,
        reason: 'PRICE_UNAVAILABLE',
        distanceKm: 50,
      });
    });

    it.each([undefined, '', 'abc', '0', '-8'])(
      'con consumo %p no estima ni consulta Argly',
      async (value) => {
        consumption = value;
        prismaMock.trip.findUnique.mockResolvedValue(leg('t1', 'TO_CAMPUS'));
        geoMock.getRouteDistanceKm.mockResolvedValue(50);

        await expect(service.estimateTrip('t1')).resolves.toMatchObject({
          available: false,
          reason: 'INVALID_CONSUMPTION',
        });
        expect(pricesMock.getPricePerLiterArs).not.toHaveBeenCalled();
      },
    );
  });

  describe('estimateRoundTrip', () => {
    it('calcula cada tramo con su propia ruta y suma el total', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        leg('ida', 'TO_CAMPUS', home, campus),
        leg('vuelta', 'FROM_CAMPUS', campus, home),
      ]);
      geoMock.getRouteDistanceKm
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(62.5);

      const estimate = await service.estimateRoundTrip('rt-1', 'driver-1');

      expect(prismaMock.trip.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roundTripId: 'rt-1', driverId: 'driver-1' },
        }),
      );
      expect(geoMock.getRouteDistanceKm).toHaveBeenNthCalledWith(1, [
        home,
        campus,
      ]);
      expect(geoMock.getRouteDistanceKm).toHaveBeenNthCalledWith(2, [
        campus,
        home,
      ]);
      // El precio se consulta una sola vez para el paquete
      expect(pricesMock.getPricePerLiterArs).toHaveBeenCalledTimes(1);

      expect(estimate.legs).toMatchObject([
        {
          tripId: 'ida',
          available: true,
          distanceKm: 50,
          liters: 4,
          costArs: 6000,
        },
        {
          tripId: 'vuelta',
          available: true,
          distanceKm: 62.5,
          liters: 5,
          costArs: 7500,
        },
      ]);
      expect(estimate.total).toEqual({ liters: 9, costArs: 13500 });
    });

    it('si falta la ruta de un tramo identifica cuál y no hay total', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        leg('ida', 'TO_CAMPUS'),
        leg('vuelta', 'FROM_CAMPUS', campus, home),
      ]);
      geoMock.getRouteDistanceKm
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(null);

      const estimate = await service.estimateRoundTrip('rt-1', 'driver-1');

      expect(estimate.legs[0]).toMatchObject({
        available: true,
        costArs: 6000,
      });
      expect(estimate.legs[1]).toMatchObject({
        tripId: 'vuelta',
        available: false,
        reason: 'NO_ROUTE',
      });
      expect(estimate.total).toBeNull();
    });

    it('si Argly falla ningún tramo tiene costo ni hay total', async () => {
      prismaMock.trip.findMany.mockResolvedValue([
        leg('ida', 'TO_CAMPUS'),
        leg('vuelta', 'FROM_CAMPUS', campus, home),
      ]);
      geoMock.getRouteDistanceKm.mockResolvedValue(40);
      pricesMock.getPricePerLiterArs.mockResolvedValue(null);

      const estimate = await service.estimateRoundTrip('rt-1', 'driver-1');

      expect(estimate.legs.map((l) => l.available)).toEqual([false, false]);
      expect(estimate.total).toBeNull();
    });

    it('un paquete ajeno, de intenciones o inexistente responde 404', async () => {
      prismaMock.trip.findMany.mockResolvedValue([]);
      await expect(
        service.estimateRoundTrip('rt-1', 'otro'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('con un solo tramo restante no se arma total de paquete', async () => {
      prismaMock.trip.findMany.mockResolvedValue([leg('ida', 'TO_CAMPUS')]);
      geoMock.getRouteDistanceKm.mockResolvedValue(50);

      const estimate = await service.estimateRoundTrip('rt-1', 'driver-1');
      expect(estimate.legs).toHaveLength(1);
      expect(estimate.total).toBeNull();
    });
  });

  describe('sumLegs', () => {
    it('suma los valores redondeados de cada tramo', () => {
      const base = {
        routeDirection: null,
        available: true as const,
        distanceKm: 1,
        consumptionLPer100Km: 8,
        pricePerLiterArs: 1,
      };
      expect(
        sumLegs([
          { ...base, tripId: 'a', liters: 0.1, costArs: 0.1 },
          { ...base, tripId: 'b', liters: 0.2, costArs: 0.2 },
        ]),
      ).toEqual({ liters: 0.3, costArs: 0.3 });
    });
  });
});
