// Contadores diarios y fotos al cierre que se guardan en DailyMetric
export const Metric = {
  REGISTERED_USERS: 'registered_users',
  COMPLETED_PROFILES: 'completed_profiles',
  SCHEDULES_CREATED: 'schedules_created',
  TRIPS_PUBLISHED: 'trips_published',
  INTENTS_PUBLISHED: 'intents_published',
  MATCHES_CREATED: 'matches_created',
  API_REQUESTS: 'api_requests',
  API_ERRORS_5XX: 'api_errors_5xx',
} as const;

export type Metric = (typeof Metric)[keyof typeof Metric];

// Eventos mínimos para los KPIs de ventana móvil de 7 días
export const KpiEventType = {
  TRIP_PUBLISHED: 'TRIP_PUBLISHED',
  INTENT_PUBLISHED: 'INTENT_PUBLISHED',
  MATCH_CREATED: 'MATCH_CREATED',
  MATCH_ACCEPTED: 'MATCH_ACCEPTED',
  MATCH_REJECTED: 'MATCH_REJECTED',
} as const;

export type KpiEventType = (typeof KpiEventType)[keyof typeof KpiEventType];
