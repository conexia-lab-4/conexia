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

export interface KpiDefinition {
  id: Kpi;
  name: string;
  kind: 'business' | 'technical' | 'health';
  unit: string;
  description: string;
  source: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'last' | 'count';
  justification: string;
}

// Catálogo que se registra en la plataforma común de Lab4. Un id registrado
// no se puede renombrar ni borrar: sólo retirar con deprecated_at
export const KPI_CATALOG: KpiDefinition[] = [
  {
    id: Kpi.REGISTERED_USERS,
    name: 'Usuarios registrados',
    kind: 'business',
    unit: '1',
    description: 'Cantidad de usuarios registrados al cierre del día.',
    source: 'Tabla User de Conexia, foto al cierre diario',
    aggregation: 'last',
    justification: 'Conocer las cuentas del prototipo.',
  },
  {
    id: Kpi.COMPLETED_PROFILES,
    name: 'Perfiles con cuestionario completo',
    kind: 'business',
    unit: '1',
    description:
      'Perfiles con el cuestionario inicial completo al cierre del día.',
    source:
      'Tabla StudentProfile (questionnaireCompleted), foto al cierre diario',
    aggregation: 'last',
    justification: 'Medir la información inicial completada.',
  },
  {
    id: Kpi.SCHEDULES_CREATED,
    name: 'Horarios creados',
    kind: 'business',
    unit: '1',
    description: 'Horarios de cursada creados durante el día.',
    source: 'Contador de creaciones exitosas de Schedule',
    aggregation: 'sum',
    justification: 'Medir la carga de horarios.',
  },
  {
    id: Kpi.TRIPS_PUBLISHED,
    name: 'Viajes publicados',
    kind: 'business',
    unit: '1',
    description: 'Viajes publicados por conductores durante el día.',
    source: 'Contador de publicaciones exitosas de Trip',
    aggregation: 'sum',
    justification: 'Medir la oferta de viajes.',
  },
  {
    id: Kpi.INTENTS_PUBLISHED,
    name: 'Intenciones de viaje publicadas',
    kind: 'business',
    unit: '1',
    description:
      'Intenciones de viaje publicadas por pasajeros durante el día.',
    source: 'Contador de publicaciones exitosas de TravelIntent',
    aggregation: 'sum',
    justification: 'Medir la demanda de viajes.',
  },
  {
    id: Kpi.API_REQUESTS,
    name: 'Solicitudes recibidas por la API',
    kind: 'technical',
    unit: '1',
    description: 'Solicitudes HTTP recibidas por el backend durante el día.',
    source: 'Middleware HTTP del backend',
    aggregation: 'sum',
    justification: 'Medir la actividad técnica recibida.',
  },
  {
    id: Kpi.API_ERRORS_5XX,
    name: 'Errores internos de la API',
    kind: 'technical',
    unit: '1',
    description: 'Respuestas HTTP 500 a 599 del backend durante el día.',
    source: 'Middleware HTTP del backend',
    aggregation: 'sum',
    justification: 'Detectar fallos del servidor.',
  },
  {
    id: Kpi.MATCHES_CREATED,
    name: 'Matches generados',
    kind: 'business',
    unit: '1',
    description:
      'Coincidencias nuevas entre viajes e intenciones durante el día, sin contar recálculos.',
    source: 'Contador de pares nuevos registrados por el matching',
    aggregation: 'sum',
    justification: 'Medir las conexiones generadas.',
  },
  {
    id: Kpi.USERS_WITH_MATCH_7D,
    name: 'Usuarios con al menos un match',
    kind: 'business',
    unit: '%',
    description:
      'Porcentaje de usuarios que publicaron un viaje o una intención en los últimos 7 días y obtuvieron al menos un match.',
    source: 'Eventos de publicación y de match de los últimos 7 días',
    aggregation: 'avg',
    justification:
      'Medir el porcentaje de usuarios activos que hayan matcheado.',
  },
  {
    id: Kpi.MATCH_ACCEPTANCE_RATE_7D,
    name: 'Tasa de aceptación de matches',
    kind: 'business',
    unit: '%',
    description:
      'Matches aceptados sobre aceptados más rechazados en los últimos 7 días. Las invalidaciones del sistema no cuentan como rechazo.',
    source: 'Eventos de aceptación y rechazo de matches de los últimos 7 días',
    aggregation: 'avg',
    justification: 'Medir el porcentaje de matches utilizados.',
  },
];
