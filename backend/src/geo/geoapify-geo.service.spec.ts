import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeoapifyGeoService } from './geoapify-geo.service';

describe('GeoapifyGeoService', () => {
  let service: GeoapifyGeoService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const jsonResponse = (body: unknown, ok = true) =>
    Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

  beforeEach(() => {
    const config = { getOrThrow: () => 'test-key' };
    service = new GeoapifyGeoService(config as unknown as ConfigService);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  describe('geocode', () => {
    it('devuelve las coordenadas cuando la confianza es suficiente', async () => {
      fetchMock.mockReturnValue(
        jsonResponse({
          results: [{ lat: -34.6, lon: -58.38, rank: { confidence: 1 } }],
        }),
      );

      await expect(service.geocode('Av. Corrientes 1234')).resolves.toEqual({
        lat: -34.6,
        lng: -58.38,
      });
    });

    it('devuelve null cuando la confianza es baja', async () => {
      fetchMock.mockReturnValue(
        jsonResponse({
          results: [{ lat: -31.1, lon: -64.3, rank: { confidence: 0 } }],
        }),
      );

      await expect(service.geocode('asdfgh 9999')).resolves.toBeNull();
    });

    it('devuelve null cuando no hay resultados', async () => {
      fetchMock.mockReturnValue(jsonResponse({ results: [] }));

      await expect(service.geocode('xyz')).resolves.toBeNull();
    });

    it('lanza ServiceUnavailableException si el proveedor falla', async () => {
      fetchMock.mockReturnValue(jsonResponse({}, false));

      await expect(service.geocode('Av. Corrientes 1234')).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('getRouteDistanceKm', () => {
    it('envía los puntos en orden y convierte metros a km', async () => {
      fetchMock.mockReturnValue(
        jsonResponse({ features: [{ properties: { distance: 12500 } }] }),
      );

      const distance = await service.getRouteDistanceKm([
        { lat: 1, lng: 2 },
        { lat: 3, lng: 4 },
        { lat: 5, lng: 6 },
        { lat: 7, lng: 8 },
      ]);

      expect(distance).toBe(12.5);
      const url = new URL(fetchMock.mock.calls[0][0] as URL);
      expect(url.searchParams.get('waypoints')).toBe('1,2|3,4|5,6|7,8');
      expect(url.searchParams.get('mode')).toBe('drive');
    });

    it('devuelve null si no hay ruta', async () => {
      fetchMock.mockReturnValue(jsonResponse({ features: [] }));

      await expect(
        service.getRouteDistanceKm([
          { lat: 1, lng: 2 },
          { lat: 3, lng: 4 },
        ]),
      ).resolves.toBeNull();
    });

    it('rechaza menos de dos puntos', async () => {
      await expect(
        service.getRouteDistanceKm([{ lat: 1, lng: 2 }]),
      ).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
