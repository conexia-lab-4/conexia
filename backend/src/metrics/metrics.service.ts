import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { argentinaDay } from './argentina-date';
import { KpiEventType, Metric } from './metric-names';

export interface KpiEventInput {
  type: KpiEventType;
  refId: string;
  userId: string;
}

// Se llama dentro de la transacción de la operación para que la métrica
// solo quede registrada si la operación se confirma
@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async increment(
    metric: Metric,
    n = 1,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    if (n <= 0) return;

    // INSERT ... ON CONFLICT es atómico: dos requests concurrentes que crean
    // la fila del día no chocan por la clave duplicada, como pasaría con upsert
    const date = argentinaDay();
    await tx.$executeRaw`
      INSERT INTO "DailyMetric" ("date", "metric", "value")
      VALUES (${date}::date, ${metric}, ${n})
      ON CONFLICT ("date", "metric")
      DO UPDATE SET "value" = "DailyMetric"."value" + EXCLUDED."value"
    `;
  }

  // Devuelve cuántos eventos se insertaron: los repetidos se ignoran
  async recordEvents(
    events: KpiEventInput[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<number> {
    if (events.length === 0) return 0;

    const { count } = await tx.kpiEvent.createMany({
      data: events,
      skipDuplicates: true,
    });
    return count;
  }
}
