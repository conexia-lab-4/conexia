import { Kpi, KPI_CATALOG } from './kpi-catalog';

// Reglas del contrato de la plataforma común (KpiCatalogWrite en openapi.yaml)
describe('KPI_CATALOG', () => {
  it('define exactamente los 10 KPIs del ADR, sin repetir', () => {
    const ids = KPI_CATALOG.map((kpi) => kpi.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.values(Kpi).sort());
  });

  it.each(KPI_CATALOG.map((kpi) => [kpi.id, kpi] as const))(
    '%s cumple el contrato de la plataforma',
    (_id, kpi) => {
      expect(kpi.id).toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
      expect(kpi.id.length).toBeLessThanOrEqual(64);
      expect(['business', 'technical', 'health']).toContain(kpi.kind);
      expect(kpi.unit).toMatch(/^\S{1,32}$/);
      expect(kpi.description.length).toBeGreaterThanOrEqual(5);
      expect(kpi.description.length).toBeLessThanOrEqual(500);
      expect(kpi.name.length).toBeLessThanOrEqual(100);
      expect(kpi.source.length).toBeLessThanOrEqual(200);
      expect(kpi.justification.length).toBeLessThanOrEqual(500);
    },
  );
});
