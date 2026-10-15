import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { addDays, argentinaDay, dayToDate } from '../metrics/argentina-date';
import { KpiCalculatorService } from '../metrics/kpi-calculator.service';
import { KPI_CATALOG, type Kpi } from '../metrics/kpi-catalog';
import {
  KpiPlatformClient,
  KpiPlatformError,
  kpiPlatformConfigFromEnv,
  type Measurement,
  type StoredMeasurement,
} from '../metrics/kpi-platform.client';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportEvidence {
  runId: string;
  github: { runId: string | null; runAttempt: string | null };
  env: string;
  date: string;
  startedAt: string;
  finishedAt: string | null;
  sent: Measurement[];
  // KPIs desconocidos para esa fecha: no se envían en vez de mandarlos en 0
  omitted: Kpi[];
  // Lo que quedó guardado en la plataforma después del envío
  stored: StoredMeasurement[];
  result:
    | { status: 'sent' }
    | { status: 'failed'; httpStatus: number | null; error: string }
    | { status: 'pending' };
}

export interface ReportDeps {
  calculator: Pick<KpiCalculatorService, 'calculate' | 'recordClosingSnapshot'>;
  client: Pick<
    KpiPlatformClient,
    'config' | 'assertProject' | 'reportMeasurements' | 'listMeasurements'
  >;
  saveEvidence: (evidence: ReportEvidence) => Promise<void>;
  now?: () => Date;
  newRunId?: () => string;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
}

// Por defecto se reporta el día anterior, ya cerrado en hora argentina.
// No se acepta el día en curso ni uno futuro: la plataforma conserva el
// primer valor recibido, así que un día sin cerrar quedaría incompleto
export function resolveReportDay(
  requested: string | undefined,
  now: Date,
): string {
  const today = argentinaDay(now);
  const day = requested?.trim() || addDays(today, -1);
  dayToDate(day);
  if (day >= today) {
    throw new Error(
      `Sólo se pueden reportar días cerrados: ${day} todavía no terminó en Argentina (hoy es ${today})`,
    );
  }
  return day;
}

export async function runReport(
  requestedDay: string | undefined,
  deps: ReportDeps,
): Promise<ReportEvidence> {
  const now = deps.now ?? (() => new Date());
  const log = deps.log ?? console.log;
  const env = deps.env ?? process.env;
  const { client, calculator } = deps;

  const day = resolveReportDay(requestedDay, now());
  const evidence: ReportEvidence = {
    runId: (deps.newRunId ?? randomUUID)(),
    github: {
      runId: env.GITHUB_RUN_ID ?? null,
      runAttempt: env.GITHUB_RUN_ATTEMPT ?? null,
    },
    env: client.config.env,
    date: day,
    startedAt: now().toISOString(),
    finishedAt: null,
    sent: [],
    omitted: [],
    stored: [],
    result: { status: 'pending' },
  };
  log(`Reporte ${evidence.runId} · ${day} · ambiente ${evidence.env}`);

  try {
    const project = await client.assertProject();
    log(`Proyecto: equipo ${project.team_number} · ${project.name}`);

    // La foto sólo representa el cierre si se toma justo después: para un día
    // anterior a ayer ya no se puede reconstruir y esos KPIs quedan sin valor
    if (day === addDays(argentinaDay(now()), -1)) {
      await calculator.recordClosingSnapshot(day);
    }

    const { values } = await calculator.calculate(day);
    for (const { id } of KPI_CATALOG) {
      const value = values[id];
      if (value === null) {
        evidence.omitted.push(id);
      } else {
        evidence.sent.push({
          kpi_id: id,
          date: day,
          env: client.config.env,
          value,
          run_id: evidence.runId,
        });
      }
    }

    if (evidence.omitted.length > 0) {
      log(`Sin valor conocido, no se envían: ${evidence.omitted.join(', ')}`);
    }
    if (evidence.sent.length === 0) {
      throw new Error(`No hay ningún KPI con valor conocido para ${day}`);
    }

    await client.reportMeasurements(evidence.sent);
    evidence.result = { status: 'sent' };
    log(`Enviados ${evidence.sent.length} KPIs`);

    evidence.stored = await client.listMeasurements(day);
    const fromEarlierRun = evidence.stored.filter(
      (stored) => stored.run_id !== evidence.runId,
    );
    if (fromEarlierRun.length > 0) {
      log(
        `Ya estaban reportados por una ejecución anterior y se conservan: ${fromEarlierRun
          .map((stored) => stored.kpi_id)
          .join(', ')}`,
      );
    }
  } catch (error) {
    evidence.result = {
      status: 'failed',
      httpStatus: error instanceof KpiPlatformError ? error.status : null,
      error: error instanceof Error ? error.message : String(error),
    };
    throw error;
  } finally {
    evidence.finishedAt = now().toISOString();
    await deps.saveEvidence(evidence);
  }

  return evidence;
}

// Copia local de lo enviado: en GitHub Actions la carpeta se sube como
// artifact y el resumen queda visible en la ejecución
export async function saveEvidenceFiles(
  evidence: ReportEvidence,
  dir = 'kpi-reports',
  env: NodeJS.ProcessEnv = process.env,
) {
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${evidence.date}_${evidence.runId}.json`);
  await writeFile(file, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Evidencia guardada en ${file}`);

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(env.GITHUB_STEP_SUMMARY, summaryMarkdown(evidence));
  }
}

export function summaryMarkdown(evidence: ReportEvidence): string {
  const stored = new Map(evidence.stored.map((m) => [m.kpi_id, m]));
  const rows = KPI_CATALOG.map(({ id }) => {
    const sent = evidence.sent.find((m) => m.kpi_id === id);
    const kept = stored.get(id);
    const value = sent ? String(sent.value) : 'sin valor (no enviado)';
    const status = !sent
      ? '—'
      : !kept
        ? 'no confirmado'
        : kept.run_id === evidence.runId
          ? 'guardado'
          : `ya existía (${kept.value})`;
    return `| \`${id}\` | ${value} | ${status} |`;
  });
  const result =
    evidence.result.status === 'failed'
      ? `❌ Falló: ${evidence.result.error}`
      : evidence.result.status === 'sent'
        ? '✅ Enviado'
        : '⏳ Sin terminar';

  return [
    `## Reporte de KPIs · ${evidence.date} · ${evidence.env}`,
    '',
    `${result}`,
    '',
    `- run_id: \`${evidence.runId}\``,
    `- KPIs enviados: ${evidence.sent.length} · sin valor: ${evidence.omitted.length}`,
    '',
    '| KPI | Valor | En la plataforma |',
    '| --- | --- | --- |',
    ...rows,
    '',
  ].join('\n');
}

function dateArgument(argv: string[]): string | undefined {
  const arg = argv.find((a) => a.startsWith('--date='));
  return arg?.slice('--date='.length) || process.env.KPI_REPORT_DATE;
}

if (require.main === module) {
  const prisma = new PrismaService();
  runReport(dateArgument(process.argv.slice(2)), {
    calculator: new KpiCalculatorService(prisma),
    client: new KpiPlatformClient(kpiPlatformConfigFromEnv()),
    saveEvidence: (evidence) => saveEvidenceFiles(evidence),
  })
    .catch((error: unknown) => {
      console.error(
        `El reporte falló: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
