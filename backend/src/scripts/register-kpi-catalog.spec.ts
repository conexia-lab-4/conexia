import type { KpiDefinition } from '../metrics/kpi-catalog';
import type { KpiPlatformClient } from '../metrics/kpi-platform.client';
import { syncCatalog } from './register-kpi-catalog';

function kpi(id: string): KpiDefinition {
  return {
    id: id as KpiDefinition['id'],
    name: id,
    kind: 'business',
    unit: '1',
    description: `Descripción de ${id}`,
    source: 'test',
    aggregation: 'sum',
    justification: 'test',
  };
}

describe('syncCatalog', () => {
  const catalog = [kpi('a'), kpi('b'), kpi('c')];
  let client: {
    config: { env: string };
    assertProject: jest.Mock;
    listCatalog: jest.Mock;
    registerCatalog: jest.Mock;
  };
  const log = jest.fn();

  const run = () =>
    syncCatalog(client as unknown as KpiPlatformClient, catalog, log);

  beforeEach(() => {
    log.mockReset();
    client = {
      config: { env: 'dev' },
      assertProject: jest
        .fn()
        .mockResolvedValue({ team_number: 10, name: 'Conexia', env: 'dev' }),
      listCatalog: jest.fn(),
      registerCatalog: jest.fn(),
    };
  });

  it('registra sólo los KPIs que faltan y verifica que hayan quedado', async () => {
    client.listCatalog
      .mockResolvedValueOnce([kpi('a')])
      .mockResolvedValueOnce(catalog);

    await run();

    expect(client.registerCatalog).toHaveBeenCalledWith([kpi('b'), kpi('c')]);
  });

  it('no registra nada si el catálogo ya está completo', async () => {
    client.listCatalog.mockResolvedValue(catalog);

    await run();

    expect(client.registerCatalog).not.toHaveBeenCalled();
  });

  it('no registra nada si la clave no corresponde al proyecto', async () => {
    client.assertProject.mockRejectedValue(new Error('PROJECT_KEY inválida'));

    await expect(run()).rejects.toThrow('PROJECT_KEY');
    expect(client.registerCatalog).not.toHaveBeenCalled();
  });

  it('falla si después de registrar sigue faltando algún KPI', async () => {
    client.listCatalog
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([kpi('a')]);

    await expect(run()).rejects.toThrow('b, c');
  });

  it('avisa si un KPI registrado difiere en tipo o unidad', async () => {
    client.listCatalog.mockResolvedValue([
      { ...kpi('a'), unit: '%' },
      kpi('b'),
      kpi('c'),
    ]);

    await run();

    expect(log).toHaveBeenCalledWith(expect.stringContaining('Atención: a'));
  });
});
