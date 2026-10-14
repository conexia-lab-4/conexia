import { Metric } from './metric-names';

// Los 10 KPIs definidos en el ADR "Reporte diario de KPIs de Conexia"
export const Kpi = {
  REGISTERED_USERS: 'registered_users',
  COMPLETED_PROFILES: 'completed_profiles',
  SCHEDULES_CREATED: 'schedules_created',
  TRIPS_PUBLISHED: 'trips_published',
  INTENTS_PUBLISHED: 'intents_published',
  API_REQUESTS: 'api_requests',
  API_ERRORS_5XX: 'api_errors_5xx',
  MATCHES_CREATED: 'matches_created',
  USERS_WITH_MATCH_7D: 'users_with_match_7d',
  MATCH_ACCEPTANCE_RATE_7D: 'match_acceptance_rate_7d',
} as const;

export type Kpi = (typeof Kpi)[keyof typeof Kpi];

// Fotos tomadas al cierre del día: si falta la fila, el valor es desconocido
export const SNAPSHOT_METRICS = [
  Metric.REGISTERED_USERS,
  Metric.COMPLETED_PROFILES,
] as const;

// Contadores del día: si falta la fila, no hubo actividad
export const COUNTER_METRICS = [
  Metric.SCHEDULES_CREATED,
  Metric.TRIPS_PUBLISHED,
  Metric.INTENTS_PUBLISHED,
  Metric.API_REQUESTS,
  Metric.API_ERRORS_5XX,
  Metric.MATCHES_CREATED,
] as const;

export const ROLLING_WINDOW_DAYS = 7;

export interface KpiReport {
  date: string;
  values: Record<Kpi, number | null>;
}
