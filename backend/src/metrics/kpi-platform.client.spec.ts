import {
  KpiPlatformClient,
  KpiPlatformConfig,
  KpiPlatformError,
  kpiPlatformConfigFromEnv,
} from './kpi-platform.client';

describe('kpiPlatformConfigFromEnv', () => {
  const env = {
    KPI_PLATFORM_URL: 'https://example.supabase.co/',
    KPI_PLATFORM_ENV: 'dev',
    SUPABASE_PUBLISHABLE_KEY: 'publishable',
    PROJECT_KEY: 'secreta',
  };

  it('lee la configuración y saca la barra final de la URL', () => {
    expect(kpiPlatformConfigFromEnv(env)).toEqual({
      url: 'https://example.supabase.co',
      env: 'dev',
      publishableKey: 'publishable',
      projectKey: 'secreta',
    });
  });

  it('falla si falta una variable', () => {
    expect(() =>
      kpiPlatformConfigFromEnv({ ...env, PROJECT_KEY: ' ' }),
    ).toThrow('PROJECT_KEY');
  });

  it('falla con un ambiente desconocido', () => {
    expect(() =>
      kpiPlatformConfigFromEnv({ ...env, KPI_PLATFORM_ENV: 'production' }),
    ).toThrow('KPI_PLATFORM_ENV');
  });
});

describe('KpiPlatformClient', () => {
  const config: KpiPlatformConfig = {
    url: 'https://example.supabase.co',
    env: 'dev',
    publishableKey: 'publishable',
    projectKey: 'secreta',
  };
  let fetchMock: jest.Mock;
  let client: KpiPlatformClient;

  const respond = (status: number, body: string) =>
    fetchMock.mockResolvedValueOnce(new Response(body || null, { status }));

  beforeEach(() => {
    fetchMock = jest.fn();
    client = new KpiPlatformClient(config, fetchMock as typeof fetch);
  });

  it('envía las mediciones con las claves y la resolución de duplicados', async () => {
    respond(201, '');
    const batch = [
      {
        kpi_id: 'trips_published',
        date: '2026-10-14',
        env: 'dev' as const,
        value: 3,
        run_id: '0192d36a-7b35-7cc4-b1bd-2d55f0d61a56',
      },
    ];

    await client.reportMeasurements(batch);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://example.supabase.co/rest/v1/measurement?on_conflict=project_id,kpi_id,date,env',
    );
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      apikey: 'publishable',
      'X-Project-Key': 'secreta',
      'Content-Type': 'application/json',
      Prefer: 'resolution=ignore-duplicates',
    });
    expect(JSON.parse(init.body as string)).toEqual(batch);
  });

  it('devuelve el proyecto de la clave sin exponer la clave', async () => {
    respond(
      200,
      '[{"team_number":10,"project_key":"secreta","name":"Conexia","env":"dev"}]',
    );

    await expect(client.currentProject()).resolves.toEqual({
      team_number: 10,
      name: 'Conexia',
      env: 'dev',
    });
  });

  it('devuelve null si la clave no identifica a ningún proyecto', async () => {
    respond(200, '[]');

    await expect(client.currentProject()).resolves.toBeNull();
  });

  it('assertProject falla si la clave no identifica a ningún proyecto', async () => {
    respond(200, '[]');

    await expect(client.assertProject()).rejects.toThrow('PROJECT_KEY');
  });

  it('assertProject falla si la clave es de otro ambiente', async () => {
    respond(200, '[{"team_number":10,"name":"Conexia","env":"prod"}]');

    await expect(client.assertProject()).rejects.toThrow('ambiente');
  });

  it('lista las mediciones de una fecha en el ambiente configurado', async () => {
    respond(200, '[]');

    await client.listMeasurements('2026-10-14');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe(
      'https://example.supabase.co/rest/v1/measurement?date=eq.2026-10-14&env=eq.dev&order=kpi_id.asc',
    );
  });

  it('actualiza un KPI del catálogo filtrando por id', async () => {
    respond(204, '');

    await client.updateCatalog('users_with_match_7d', {
      description: 'Nueva descripción',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://example.supabase.co/rest/v1/kpi_catalog?id=eq.users_with_match_7d',
    );
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({
      description: 'Nueva descripción',
    });
  });

  it('una respuesta no exitosa lanza un error con el status y el cuerpo', async () => {
    respond(409, '{"message":"KPI inexistente"}');

    const error = await client.registerCatalog([]).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(KpiPlatformError);
    expect(error).toMatchObject({ status: 409 });
    expect((error as Error).message).toContain('KPI inexistente');
    expect((error as Error).message).not.toContain('secreta');
  });
});
