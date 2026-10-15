import type { KpiDefinition } from './kpi-catalog';

export type KpiPlatformEnv = 'dev' | 'qa' | 'prod';

export interface KpiPlatformConfig {
  url: string;
  env: KpiPlatformEnv;
  publishableKey: string;
  projectKey: string;
}

export interface PlatformProject {
  team_number: number;
  name: string;
  env: KpiPlatformEnv;
}

export interface Measurement {
  kpi_id: string;
  date: string;
  env: KpiPlatformEnv;
  value: number;
  run_id: string;
}

export interface StoredMeasurement extends Measurement {
  reported_at: string;
}

export class KpiPlatformError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`La plataforma de KPIs respondió ${status}: ${body}`);
  }
}

const ENVIRONMENTS: KpiPlatformEnv[] = ['dev', 'qa', 'prod'];

// Lee la configuración de las variables de entorno (GitHub Secrets en CI,
// backend/.env en local) y falla si falta alguna
export function kpiPlatformConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): KpiPlatformConfig {
  const read = (name: string) => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Falta la variable de entorno ${name}`);
    return value;
  };

  const platformEnv = read('KPI_PLATFORM_ENV');
  if (!ENVIRONMENTS.includes(platformEnv as KpiPlatformEnv)) {
    throw new Error(
      `KPI_PLATFORM_ENV debe ser ${ENVIRONMENTS.join(', ')}; se recibió "${platformEnv}"`,
    );
  }

  return {
    url: read('KPI_PLATFORM_URL').replace(/\/+$/, ''),
    env: platformEnv as KpiPlatformEnv,
    publishableKey: read('SUPABASE_PUBLISHABLE_KEY'),
    projectKey: read('PROJECT_KEY'),
  };
}

// Cliente de la plataforma común de Lab4 (Supabase / PostgREST).
// La PROJECT_KEY sólo viaja en el header: nunca se incluye en errores ni logs
export class KpiPlatformClient {
  constructor(
    readonly config: KpiPlatformConfig,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async currentProject(): Promise<PlatformProject | null> {
    const rows = await this.request<PlatformProject[]>(
      'POST',
      '/rest/v1/rpc/current_project',
      {},
    );
    if (!rows || rows.length === 0) return null;
    const { team_number, name, env } = rows[0];
    return { team_number, name, env };
  }

  // Falla si la clave no es válida o no corresponde al ambiente configurado,
  // antes de escribir nada en la plataforma
  async assertProject(): Promise<PlatformProject> {
    const project = await this.currentProject();
    if (!project) {
      throw new Error(
        'La PROJECT_KEY no es válida, fue revocada o el proyecto está inactivo',
      );
    }
    if (project.env !== this.config.env) {
      throw new Error(
        `La PROJECT_KEY es del ambiente "${project.env}" pero KPI_PLATFORM_ENV es "${this.config.env}"`,
      );
    }
    return project;
  }

  async listCatalog(): Promise<KpiDefinition[]> {
    return (
      (await this.request<KpiDefinition[]>(
        'GET',
        '/rest/v1/kpi_catalog?order=id.asc',
      )) ?? []
    );
  }

  async registerCatalog(definitions: KpiDefinition[]) {
    await this.request('POST', '/rest/v1/kpi_catalog', definitions);
  }

  // Un mismo (kpi, fecha, ambiente) queda con el primer valor aceptado:
  // reenviar el lote responde OK sin duplicar ni modificar
  async reportMeasurements(measurements: Measurement[]) {
    await this.request(
      'POST',
      '/rest/v1/measurement?on_conflict=project_id,kpi_id,date,env',
      measurements,
      { Prefer: 'resolution=ignore-duplicates' },
    );
  }

  async listMeasurements(date: string): Promise<StoredMeasurement[]> {
    return (
      (await this.request<StoredMeasurement[]>(
        'GET',
        `/rest/v1/measurement?date=eq.${encodeURIComponent(date)}&env=eq.${this.config.env}&order=kpi_id.asc`,
      )) ?? []
    );
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T | null> {
    const response = await this.fetchFn(`${this.config.url}${path}`, {
      method,
      headers: {
        apikey: this.config.publishableKey,
        'X-Project-Key': this.config.projectKey,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new KpiPlatformError(response.status, text);
    }
    return text ? (JSON.parse(text) as T) : null;
  }
}
