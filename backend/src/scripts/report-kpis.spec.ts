import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { KpiReport } from '../metrics/kpi-catalog';
import { KpiPlatformError } from '../metrics/kpi-platform.client';
import {
  type ReportDeps,
  type ReportEvidence,
  resolveReportDay,
  runReport,
  saveEvidenceFiles,
  summaryMarkdown,
} from './report-kpis';

// 15/10 a las 01:17 en Argentina (04:17 UTC): "ayer" es el 14
const NOW = new Date('2026-10-15T04:17:00Z');
const RUN_ID = '0192d36a-7b35-7cc4-b1bd-2d55f0d61a56';

function values(overrides: Partial<KpiReport['values']> = {}) {
  return {
    registered_users: 40,
    completed_profiles: 25,
    schedules_created: 3,
    trips_published: 2,
    intents_published: 4,
    api_requests: 900,
    api_errors_5xx: 1,
    matches_created: 5,
    users_with_match_7d: 50,
    match_acceptance_rate_7d: 75,
    ...overrides,
  };
}

describe('resolveReportDay', () => {
  it('por defecto reporta ayer en hora argentina', () => {
    // 15/10 01:00 UTC todavía es 14/10 en Argentina: ayer es el 13
    expect(resolveReportDay(undefined, new Date('2026-10-15T01:00:00Z'))).toBe(
      '2026-10-13',
    );
    expect(resolveReportDay(undefined, NOW)).toBe('2026-10-14');
  });

  it('acepta una fecha pasada', () => {
    expect(resolveReportDay('2026-10-01', NOW)).toBe('2026-10-01');
  });

  it.each(['2026-10-15', '2026-10-20'])(
    'rechaza %s porque el día no terminó',
    (day) => {
      expect(() => resolveReportDay(day, NOW)).toThrow('días cerrados');
    },
  );

  it('rechaza un formato inválido', () => {
    expect(() => resolveReportDay('14/10/2026', NOW)).toThrow('Fecha inválida');
  });
});

describe('runReport', () => {
  let calculator: { calculate: jest.Mock; recordClosingSnapshot: jest.Mock };
  let client: {
    config: { env: 'dev' };
    assertProject: jest.Mock;
    reportMeasurements: jest.Mock;
    listMeasurements: jest.Mock;
  };
  let deps: ReportDeps & { saveEvidence: jest.Mock; log: jest.Mock };

  beforeEach(() => {
    calculator = {
      calculate: jest
        .fn()
        .mockImplementation((date: string) => ({ date, values: values() })),
      recordClosingSnapshot: jest.fn(),
    };
    client = {
      config: { env: 'dev' },
      assertProject: jest
        .fn()
        .mockResolvedValue({ team_number: 10, name: 'Conexia', env: 'dev' }),
      reportMeasurements: jest.fn(),
      listMeasurements: jest.fn().mockResolvedValue([]),
    };
    deps = {
      calculator,
      client: client as unknown as ReportDeps['client'],
      saveEvidence: jest.fn(),
      now: () => NOW,
      newRunId: () => RUN_ID,
      env: { GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2' },
      log: jest.fn(),
    };
  });

  it('envía los 10 KPIs con la fecha, el ambiente y el run_id', async () => {
    const evidence = await runReport(undefined, deps);

    const [batch] = client.reportMeasurements.mock.calls[0] as [
      ReportEvidence['sent'],
    ];
    expect(batch).toHaveLength(10);
    expect(batch).toContainEqual({
      kpi_id: 'trips_published',
      date: '2026-10-14',
      env: 'dev',
      value: 2,
      run_id: RUN_ID,
    });
    expect(evidence.result).toEqual({ status: 'sent' });
    expect(evidence.github).toEqual({ runId: '123', runAttempt: '2' });
  });

  it('toma la foto de cierre antes de calcular el día de ayer', async () => {
    await runReport(undefined, deps);

    expect(calculator.recordClosingSnapshot).toHaveBeenCalledWith('2026-10-14');
    expect(
      calculator.recordClosingSnapshot.mock.invocationCallOrder[0],
    ).toBeLessThan(calculator.calculate.mock.invocationCallOrder[0]);
  });

  it('no toma la foto de un día anterior a ayer, porque ya no es el cierre', async () => {
    await runReport('2026-10-10', deps);

    expect(calculator.recordClosingSnapshot).not.toHaveBeenCalled();
  });

  it('omite los KPIs desconocidos en vez de enviarlos en 0', async () => {
    calculator.calculate.mockResolvedValue({
      date: '2026-10-14',
      values: values({
        registered_users: null,
        match_acceptance_rate_7d: null,
      }),
    });

    const evidence = await runReport(undefined, deps);

    const [batch] = client.reportMeasurements.mock.calls[0] as [
      ReportEvidence['sent'],
    ];
    expect(batch.map((m) => m.kpi_id)).not.toContain('registered_users');
    expect(batch).toHaveLength(8);
    expect(evidence.omitted).toEqual([
      'registered_users',
      'match_acceptance_rate_7d',
    ]);
  });

  it('falla si no hay ningún KPI con valor conocido', async () => {
    calculator.calculate.mockResolvedValue({
      date: '2026-10-14',
      values: Object.fromEntries(
        Object.keys(values()).map((kpi) => [kpi, null]),
      ),
    });

    await expect(runReport(undefined, deps)).rejects.toThrow('ningún KPI');
    expect(client.reportMeasurements).not.toHaveBeenCalled();
  });

  it('no calcula ni envía si la clave no corresponde al proyecto', async () => {
    client.assertProject.mockRejectedValue(new Error('PROJECT_KEY'));

    await expect(runReport(undefined, deps)).rejects.toThrow('PROJECT_KEY');
    expect(calculator.calculate).not.toHaveBeenCalled();
    expect(client.reportMeasurements).not.toHaveBeenCalled();
  });

  it('un error de la plataforma falla el reporte y guarda la evidencia del fallo', async () => {
    client.reportMeasurements.mockRejectedValue(
      new KpiPlatformError(400, '{"message":"fecha futura"}'),
    );

    await expect(runReport(undefined, deps)).rejects.toThrow('400');

    const [evidence] = deps.saveEvidence.mock.calls[0] as [ReportEvidence];
    expect(evidence.result).toMatchObject({
      status: 'failed',
      httpStatus: 400,
    });
    expect(evidence.sent).toHaveLength(10);
    expect(evidence.finishedAt).not.toBeNull();
  });

  it('guarda lo que quedó en la plataforma, incluidos valores de una ejecución anterior', async () => {
    client.listMeasurements.mockResolvedValue([
      {
        kpi_id: 'trips_published',
        date: '2026-10-14',
        env: 'dev',
        value: 1,
        run_id: 'otra-ejecucion',
        reported_at: '2026-10-15T04:00:00Z',
      },
    ]);

    const evidence = await runReport(undefined, deps);

    expect(evidence.stored).toHaveLength(1);
    expect(deps.log).toHaveBeenCalledWith(
      expect.stringContaining('ejecución anterior'),
    );
  });
});

describe('saveEvidenceFiles', () => {
  const evidence: ReportEvidence = {
    runId: RUN_ID,
    github: { runId: '123', runAttempt: '1' },
    env: 'dev',
    date: '2026-10-14',
    startedAt: NOW.toISOString(),
    finishedAt: NOW.toISOString(),
    sent: [
      {
        kpi_id: 'trips_published',
        date: '2026-10-14',
        env: 'dev',
        value: 2,
        run_id: RUN_ID,
      },
    ],
    omitted: ['registered_users'],
    stored: [],
    result: { status: 'sent' },
  };

  it('escribe la evidencia y el resumen de GitHub Actions', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const dir = await mkdtemp(join(tmpdir(), 'kpi-report-'));
    const summary = join(dir, 'summary.md');

    await saveEvidenceFiles(evidence, join(dir, 'kpi-reports'), {
      GITHUB_STEP_SUMMARY: summary,
    });

    const [file] = await readdir(join(dir, 'kpi-reports'));
    expect(file).toBe(`2026-10-14_${RUN_ID}.json`);
    const saved = JSON.parse(
      await readFile(join(dir, 'kpi-reports', file), 'utf8'),
    ) as ReportEvidence;
    expect(saved).toEqual(evidence);
    expect(await readFile(summary, 'utf8')).toContain(RUN_ID);
  });

  it('el resumen distingue enviados, guardados y omitidos', () => {
    const markdown = summaryMarkdown({
      ...evidence,
      stored: [{ ...evidence.sent[0], reported_at: NOW.toISOString() }],
    });

    expect(markdown).toContain('| `trips_published` | 2 | guardado |');
    expect(markdown).toContain(
      '| `registered_users` | sin valor (no enviado) | — |',
    );
  });
});
