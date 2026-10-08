import { computeDetourKm, effectiveDetourToleranceKm } from './detour';

describe('computeDetourKm', () => {
  const driver = {
    origin: { lat: -34.45, lng: -58.91 },
    destination: { lat: -34.59, lng: -58.43 },
  };
  const passenger = {
    origin: { lat: -34.5, lng: -58.8 },
    destination: { lat: -34.58, lng: -58.45 },
  };
  let geoMock: { geocode: jest.Mock; getRouteDistanceKm: jest.Mock };

  beforeEach(() => {
    geoMock = { geocode: jest.fn(), getRouteDistanceKm: jest.fn() };
  });

  it('calcula el desvío como la diferencia entre la ruta con pasajero y la directa', async () => {
    geoMock.getRouteDistanceKm.mockImplementation((points: unknown[]) =>
      Promise.resolve(points.length === 2 ? 10 : 13),
    );

    const detour = await computeDetourKm(geoMock, driver, passenger);

    expect(detour).toBe(3);
  });

  it('recorre los puntos en orden conductor → pasajero → pasajero → conductor', async () => {
    geoMock.getRouteDistanceKm.mockResolvedValue(10);

    await computeDetourKm(geoMock, driver, passenger);

    expect(geoMock.getRouteDistanceKm).toHaveBeenCalledWith([
      driver.origin,
      passenger.origin,
      passenger.destination,
      driver.destination,
    ]);
  });

  it('devuelve null si alguna ruta no se puede calcular', async () => {
    geoMock.getRouteDistanceKm
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(null);

    const detour = await computeDetourKm(geoMock, driver, passenger);

    expect(detour).toBeNull();
  });
});

describe('effectiveDetourToleranceKm', () => {
  it('vale 0 cuando la tolerancia no está configurada', () => {
    expect(effectiveDetourToleranceKm(null)).toBe(0);
    expect(effectiveDetourToleranceKm(undefined)).toBe(0);
  });

  it('respeta la tolerancia configurada', () => {
    expect(effectiveDetourToleranceKm(3)).toBe(3);
  });
});
