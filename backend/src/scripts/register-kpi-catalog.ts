import { KPI_CATALOG, type KpiDefinition } from '../metrics/kpi-catalog';
import {
  KpiPlatformClient,
  kpiPlatformConfigFromEnv,
} from '../metrics/kpi-platform.client';

// Registra en la plataforma común los KPIs del catálogo que todavía no estén.
// Se puede correr varias veces: los ya registrados no se vuelven a enviar.
// El catálogo es por ambiente, así que hay que correrlo con la clave de cada uno
export async function syncCatalog(
  client: KpiPlatformClient,
  catalog: KpiDefinition[],
  log: (message: string) => void = console.log,
) {
  const project = await client.assertProject();
  log(
    `Proyecto: equipo ${project.team_number} · ${project.name} · ${project.env}`,
  );

  const registered = new Map(
    (await client.listCatalog()).map((kpi) => [kpi.id, kpi]),
  );

  for (const kpi of catalog) {
    const existing = registered.get(kpi.id);
    if (!existing) continue;

    if (existing.kind !== kpi.kind || existing.unit !== kpi.unit) {
      log(
        `Atención: ${kpi.id} ya está registrado como ${existing.kind}/${existing.unit} y el catálogo local dice ${kpi.kind}/${kpi.unit}`,
      );
    }

    const patch = {
      ...(existing.description !== kpi.description && {
        description: kpi.description,
      }),
      ...(existing.aggregation !== kpi.aggregation && {
        aggregation: kpi.aggregation,
      }),
    };
    if (Object.keys(patch).length > 0) {
      log(`Actualizando ${Object.keys(patch).join(' y ')} de ${kpi.id}`);
      await client.updateCatalog(kpi.id, patch);
    }
  }

  const missing = catalog.filter((kpi) => !registered.has(kpi.id));
  if (missing.length === 0) {
    log(`El catálogo ya tiene los ${catalog.length} KPIs registrados`);
    return;
  }

  log(
    `Registrando ${missing.length} KPIs: ${missing.map((k) => k.id).join(', ')}`,
  );
  await client.registerCatalog(missing);

  const afterIds = new Set((await client.listCatalog()).map((kpi) => kpi.id));
  const stillMissing = catalog.filter((kpi) => !afterIds.has(kpi.id));
  if (stillMissing.length > 0) {
    throw new Error(
      `No quedaron registrados: ${stillMissing.map((k) => k.id).join(', ')}`,
    );
  }
  log(`Catálogo completo: ${catalog.length} KPIs registrados`);
}

if (require.main === module) {
  syncCatalog(
    new KpiPlatformClient(kpiPlatformConfigFromEnv()),
    KPI_CATALOG,
  ).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
