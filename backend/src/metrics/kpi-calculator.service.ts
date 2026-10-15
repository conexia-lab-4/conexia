import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, ARGENTINA_TIME_ZONE, dayToDate } from './argentina-date';
import {
  COUNTER_METRICS,
  Kpi,
  KpiReport,
  ROLLING_WINDOW_DAYS,
  SNAPSHOT_METRICS,
} from './kpi-catalog';
import { KpiEventType, Metric } from './metric-names';

// Los porcentajes se informan con dos decimales
const percentage = (part: number, total: number) =>
  total === 0 ? null : Math.round((part / total) * 10000) / 100;

@Injectable()
export class KpiCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  // Guarda los totales existentes como foto del cierre de `day`. La toma el
  // proceso de reporte al cerrar el día, porque después no se pueden
  // reconstruir: los registros pueden haberse borrado o modificado.
  // Queda la primera foto, igual que en la plataforma queda el primer valor
  // reportado: un reintento no la reemplaza
  async recordClosingSnapshot(day: string) {
    const [registeredUsers, completedProfiles] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.studentProfile.count({
        where: { questionnaireCompleted: true },
      }),
    ]);

    await this.insertSnapshot(day, Metric.REGISTERED_USERS, registeredUsers);
    await this.insertSnapshot(
      day,
      Metric.COMPLETED_PROFILES,
      completedProfiles,
    );
  }

  // Un valor desconocido se devuelve como null, nunca como 0
  async calculate(day: string): Promise<KpiReport> {
    const date = dayToDate(day);
    const trackingStart = await this.trackingStart();

    // Antes de que existiera la instrumentación no hay forma de saber qué pasó
    if (!trackingStart || date < trackingStart) {
      return { date: day, values: this.unknownValues() };
    }

    const rows = await this.prisma.dailyMetric.findMany({ where: { date } });
    const stored = new Map(rows.map((row) => [row.metric, row.value]));

    const snapshot = (metric: (typeof SNAPSHOT_METRICS)[number]) =>
      stored.get(metric) ?? null;
    const counter = (metric: (typeof COUNTER_METRICS)[number]) =>
      stored.get(metric) ?? 0;

    const windowStart = addDays(day, -(ROLLING_WINDOW_DAYS - 1));
    const [usersWithMatch, acceptanceRate] = await Promise.all([
      this.usersWithMatch(windowStart, day),
      this.acceptanceRate(windowStart, day),
    ]);

    return {
      date: day,
      values: {
        [Kpi.REGISTERED_USERS]: snapshot(Metric.REGISTERED_USERS),
        [Kpi.COMPLETED_PROFILES]: snapshot(Metric.COMPLETED_PROFILES),
        [Kpi.SCHEDULES_CREATED]: counter(Metric.SCHEDULES_CREATED),
        [Kpi.TRIPS_PUBLISHED]: counter(Metric.TRIPS_PUBLISHED),
        [Kpi.INTENTS_PUBLISHED]: counter(Metric.INTENTS_PUBLISHED),
        [Kpi.API_REQUESTS]: counter(Metric.API_REQUESTS),
        [Kpi.API_ERRORS_5XX]: counter(Metric.API_ERRORS_5XX),
        [Kpi.MATCHES_CREATED]: counter(Metric.MATCHES_CREATED),
        [Kpi.USERS_WITH_MATCH_7D]: usersWithMatch,
        [Kpi.MATCH_ACCEPTANCE_RATE_7D]: acceptanceRate,
      },
    };
  }

  // Usuarios que publicaron un viaje o una intención en la ventana y además
  // generaron al menos un match en ella, sobre todos los que publicaron
  private async usersWithMatch(from: string, to: string) {
    const [row] = await this.prisma.$queryRaw<
      { travelers: bigint; matched: bigint }[]
    >`
      SELECT
        COUNT(*) AS travelers,
        COUNT(*) FILTER (WHERE matched) AS matched
      FROM (
        SELECT "userId", bool_or("type" = ${KpiEventType.MATCH_CREATED}) AS matched
        FROM "KpiEvent"
        WHERE "type" IN (
            ${KpiEventType.TRIP_PUBLISHED},
            ${KpiEventType.INTENT_PUBLISHED},
            ${KpiEventType.MATCH_CREATED}
          )
          AND (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ARGENTINA_TIME_ZONE})::date
            BETWEEN ${from}::date AND ${to}::date
        GROUP BY "userId"
        HAVING bool_or("type" IN (${KpiEventType.TRIP_PUBLISHED}, ${KpiEventType.INTENT_PUBLISHED}))
      ) AS travelers
    `;

    return percentage(Number(row.matched), Number(row.travelers));
  }

  // ACCEPTED / (ACCEPTED + REJECTED) de los matches resueltos en la ventana.
  // INVALIDATED no genera evento, así que no cuenta como rechazo
  private async acceptanceRate(from: string, to: string) {
    const [row] = await this.prisma.$queryRaw<
      { accepted: bigint; rejected: bigint }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE "type" = ${KpiEventType.MATCH_ACCEPTED}) AS accepted,
        COUNT(*) FILTER (WHERE "type" = ${KpiEventType.MATCH_REJECTED}) AS rejected
      FROM "KpiEvent"
      WHERE "type" IN (${KpiEventType.MATCH_ACCEPTED}, ${KpiEventType.MATCH_REJECTED})
        AND (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ARGENTINA_TIME_ZONE})::date
          BETWEEN ${from}::date AND ${to}::date
    `;

    const accepted = Number(row.accepted);
    return percentage(accepted, accepted + Number(row.rejected));
  }

  // Primer día con algún contador registrado. Las fotos no cuentan: se pueden
  // tomar para un día anterior a la instrumentación y no prueban que entonces
  // se estuviera midiendo
  private async trackingStart() {
    const { _min } = await this.prisma.dailyMetric.aggregate({
      where: { metric: { in: [...COUNTER_METRICS] } },
      _min: { date: true },
    });
    return _min.date;
  }

  private async insertSnapshot(day: string, metric: Metric, value: number) {
    await this.prisma.$executeRaw`
      INSERT INTO "DailyMetric" ("date", "metric", "value")
      VALUES (${day}::date, ${metric}, ${value})
      ON CONFLICT ("date", "metric") DO NOTHING
    `;
  }

  private unknownValues(): Record<Kpi, null> {
    return Object.fromEntries(
      Object.values(Kpi).map((kpi) => [kpi, null]),
    ) as Record<Kpi, null>;
  }
}
