import { Logger } from '@nestjs/common';
import { FuelPriceService } from './fuel-price.service';

describe('FuelPriceService', () => {
  let service: FuelPriceService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const response = (body: unknown, ok = true, status = 200) =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    } as Response);

  const arglyBody = (precio: unknown) => ({
    data: {
      provincia: 'buenos aires',
      combustible: 'Nafta Super',
      precio_promedio: precio,
    },
  });

  beforeEach(() => {
    service = new FuelPriceService();
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('consulta Argly con provincia y combustible y usa el promedio', async () => {
    fetchMock.mockReturnValue(response(arglyBody(1500)));

    await expect(service.getPricePerLiterArs()).resolves.toBe(1500);

    const url = new URL((fetchMock.mock.calls[0][0] as URL).toString());
    expect(url.origin + url.pathname).toBe(
      'https://api.argly.com.ar/v1/combustibles/promedio',
    );
    expect(url.searchParams.get('provincia')).toBe('Buenos Aires');
    expect(url.searchParams.get('combustible')).toBe('Nafta Super');
  });

  it.each([['1500'], [0], [-10], [null], [undefined], [NaN]])(
    'devuelve null si el precio es %p',
    async (precio) => {
      fetchMock.mockReturnValue(response(arglyBody(precio)));
      await expect(service.getPricePerLiterArs()).resolves.toBeNull();
    },
  );

  it('devuelve null si la respuesta no trae data', async () => {
    fetchMock.mockReturnValue(response({ error: 'x' }));
    await expect(service.getPricePerLiterArs()).resolves.toBeNull();
  });

  it('devuelve null si Argly responde con error', async () => {
    fetchMock.mockReturnValue(response({}, false, 500));
    await expect(service.getPricePerLiterArs()).resolves.toBeNull();
  });

  it('devuelve null si la red falla, sin lanzar', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await expect(service.getPricePerLiterArs()).resolves.toBeNull();
  });

  it('reutiliza un precio válido sin volver a consultar', async () => {
    fetchMock.mockReturnValue(response(arglyBody(1500)));

    await service.getPricePerLiterArs();
    await expect(service.getPricePerLiterArs()).resolves.toBe(1500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no guarda un fallo: el siguiente pedido vuelve a consultar', async () => {
    fetchMock
      .mockReturnValueOnce(response({}, false, 503))
      .mockReturnValueOnce(response(arglyBody(1800)));

    await expect(service.getPricePerLiterArs()).resolves.toBeNull();
    await expect(service.getPricePerLiterArs()).resolves.toBe(1800);
  });
});
