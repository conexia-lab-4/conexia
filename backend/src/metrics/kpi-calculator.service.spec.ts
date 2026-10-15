import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KpiCalculatorService } from './kpi-calculator.service';

// Integración contra Postgres: cada test corre en una transacción que se
// revierte al final, así no deja datos y no ve los de otros tests
class Rollback extends Error {}

describe('KpiCalculatorService', () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // Fechas lejanas para no cruzarse con datos reales de la base
  const DAY = '2020-03-10';

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function withRollback(
    test: (
      calculator: KpiCalculatorService,
      tx: Prisma.TransactionClient,
    ) => Promise<void>,
  ) {
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.kpiEvent.deleteMany();
        await tx.dailyMetric.deleteMany();
        await test(
          new KpiCalculatorService(tx as unknown as PrismaService),
          tx,
        );
        throw new Rollback();
      }),
    ).rejects.toBeInstanceOf(Rollback);
  }

  // `at` es la hora UTC; Argentina es UTC-3
  function event(
    type: string,
    userId: string,
    refId: string,
    at: string,
  ): Prisma.KpiEventCreateManyInput {
    return { type, userId, refId, occurredAt: new Date(at) };
  }

  function metric(day: string, name: string, value: number) {
    return { date: new Date(`${day}T00:00:00.000Z`), metric: name, value };
  }

  it('devuelve todo null para un día anterior a la instrumentación', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 5) });

      const report = await calculator.calculate('2020-03-09');

      expect(Object.values(report.values).every((v) => v === null)).toBe(true);
    });
  });

  it('una foto de cierre no adelanta el inicio de la instrumentación', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 5) });

      await calculator.recordClosingSnapshot('2020-03-09');
      const report = await calculator.calculate('2020-03-09');

      expect(Object.values(report.values).every((v) => v === null)).toBe(true);
    });
  });

  it('lee los contadores del día y usa 0 si no hubo actividad', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.createMany({
        data: [
          metric(DAY, 'trips_published', 3),
          metric(DAY, 'api_requests', 120),
          metric(DAY, 'api_errors_5xx', 2),
        ],
      });

      const { values } = await calculator.calculate(DAY);

      expect(values.trips_published).toBe(3);
      expect(values.api_requests).toBe(120);
      expect(values.api_errors_5xx).toBe(2);
      expect(values.schedules_created).toBe(0);
      expect(values.intents_published).toBe(0);
      expect(values.matches_created).toBe(0);
    });
  });

  it('deja en null una foto de cierre que no se tomó', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 1) });

      const { values } = await calculator.calculate(DAY);

      expect(values.registered_users).toBeNull();
      expect(values.completed_profiles).toBeNull();
    });
  });

  it('la foto de cierre guarda los totales y un reintento no la reemplaza', async () => {
    await withRollback(async (calculator, tx) => {
      const users = await tx.user.count();
      const profiles = await tx.studentProfile.count({
        where: { questionnaireCompleted: true },
      });

      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 1) });
      await calculator.recordClosingSnapshot(DAY);
      await tx.user.create({
        data: { id: 'kpi-snapshot-user', email: 'kpi-snapshot@test.local' },
      });
      await calculator.recordClosingSnapshot(DAY);
      const { values } = await calculator.calculate(DAY);

      expect(values.registered_users).toBe(users);
      expect(values.completed_profiles).toBe(profiles);
    });
  });

  it('usuarios con match: matcheados sobre los que publicaron en los últimos 7 días', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({
        data: metric('2020-03-01', 'api_requests', 0),
      });
      await tx.kpiEvent.createMany({
        data: [
          // Publicó y matcheó dentro de la ventana
          event('TRIP_PUBLISHED', 'conductor', 'trip-1', '2020-03-05T12:00Z'),
          event('MATCH_CREATED', 'conductor', 't1:i1', '2020-03-05T13:00Z'),
          event(
            'INTENT_PUBLISHED',
            'pasajero',
            'intent-1',
            '2020-03-04T12:00Z',
          ),
          event('MATCH_CREATED', 'pasajero', 't1:i1', '2020-03-05T13:00Z'),
          // Publicó pero no matcheó
          event(
            'INTENT_PUBLISHED',
            'sin-match',
            'intent-2',
            '2020-03-10T12:00Z',
          ),
          // Publicó antes de la ventana (03-04 a 03-10): no cuenta
          event('INTENT_PUBLISHED', 'viejo', 'intent-3', '2020-03-03T12:00Z'),
          event('MATCH_CREATED', 'viejo', 't2:i3', '2020-03-05T12:00Z'),
        ],
      });

      const { values } = await calculator.calculate(DAY);

      // conductor y pasajero matchearon; sin-match no: 2 de 3
      expect(values.users_with_match_7d).toBe(66.67);
    });
  });

  it('usa el día de Argentina para los bordes de la ventana', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({
        data: metric('2020-03-01', 'api_requests', 0),
      });
      await tx.kpiEvent.createMany({
        data: [
          // 03-11 01:00 UTC es 03-10 22:00 en Argentina: entra
          event('INTENT_PUBLISHED', 'tarde', 'intent-1', '2020-03-11T01:00Z'),
          // 03-11 03:30 UTC ya es 03-11 en Argentina: no entra
          event('INTENT_PUBLISHED', 'manana', 'intent-2', '2020-03-11T03:30Z'),
          // 03-04 02:00 UTC es 03-03 23:00 en Argentina: no entra
          event('INTENT_PUBLISHED', 'antes', 'intent-3', '2020-03-04T02:00Z'),
        ],
      });

      const { values } = await calculator.calculate(DAY);

      // Solo "tarde" está en la ventana y no matcheó
      expect(values.users_with_match_7d).toBe(0);
    });
  });

  it('usuarios con match es 0 si nadie publicó en la ventana', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 1) });

      const { values } = await calculator.calculate(DAY);

      expect(values.users_with_match_7d).toBe(0);
    });
  });

  it('tasa de aceptación: ACCEPTED / (ACCEPTED + REJECTED) en los últimos 7 días', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({
        data: metric('2020-03-01', 'api_requests', 0),
      });
      await tx.kpiEvent.createMany({
        data: [
          event('MATCH_ACCEPTED', 'p1', 'm1', '2020-03-06T12:00Z'),
          event('MATCH_ACCEPTED', 'p2', 'm2', '2020-03-08T12:00Z'),
          event('MATCH_ACCEPTED', 'p3', 'm3', '2020-03-10T12:00Z'),
          event('MATCH_REJECTED', 'p4', 'm4', '2020-03-09T12:00Z'),
          // Fuera de la ventana
          event('MATCH_REJECTED', 'p5', 'm5', '2020-03-02T12:00Z'),
        ],
      });

      const { values } = await calculator.calculate(DAY);

      expect(values.match_acceptance_rate_7d).toBe(75);
    });
  });

  it('tasa de aceptación es 0 si nadie aceptó ni rechazó en la ventana', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 1) });

      const { values } = await calculator.calculate(DAY);

      expect(values.match_acceptance_rate_7d).toBe(0);
    });
  });

  it('un día anterior a la instrumentación sigue sin valor en los KPIs de 7 días', async () => {
    await withRollback(async (calculator, tx) => {
      await tx.dailyMetric.create({ data: metric(DAY, 'api_requests', 1) });

      const { values } = await calculator.calculate('2020-03-09');

      expect(values.users_with_match_7d).toBeNull();
      expect(values.match_acceptance_rate_7d).toBeNull();
    });
  });

  it('rechaza una fecha con formato inválido', async () => {
    await withRollback(async (calculator) => {
      await expect(calculator.calculate('10/03/2020')).rejects.toThrow(
        'Fecha inválida',
      );
    });
  });
});
