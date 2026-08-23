import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

describe('Subject and Schedule persistence', () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const testUserId = 'test-user-subject-schedule';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: { id: testUserId, email: `${testUserId}@example.com` },
    });
  });

  afterEach(async () => {
    await prisma.subject.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('crea un subject asociado al usuario', async () => {
    const subject = await prisma.subject.create({
      data: {
        userId: testUserId,
        name: 'Análisis Matemático',
      },
    });

    expect(subject.id).toBeDefined();
    expect(subject.userId).toBe(testUserId);
    expect(subject.name).toBe('Análisis Matemático');
  });

  it('crea un schedule asociado a un subject', async () => {
    const subject = await prisma.subject.create({
      data: {
        userId: testUserId,
        name: 'Álgebra',
      },
    });

    const schedule = await prisma.schedule.create({
      data: {
        subjectId: subject.id,
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '10:00',
      },
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.subjectId).toBe(subject.id);
    expect(schedule.dayOfWeek).toBe('MONDAY');
  });

  it('permite que un subject tenga varios schedules', async () => {
    const subject = await prisma.subject.create({
      data: {
        userId: testUserId,
        name: 'Física I',
      },
    });

    await prisma.schedule.create({
      data: {
        subjectId: subject.id,
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '10:00',
      },
    });
    await prisma.schedule.create({
      data: {
        subjectId: subject.id,
        dayOfWeek: 'WEDNESDAY',
        startTime: '08:00',
        endTime: '10:00',
      },
    });

    const subjectWithSchedules = await prisma.subject.findUnique({
      where: { id: subject.id },
      include: { schedules: true },
    });

    expect(subjectWithSchedules?.schedules).toHaveLength(2);
  });

  it('borra los schedules en cascada al borrar el subject', async () => {
    const subject = await prisma.subject.create({
      data: {
        userId: testUserId,
        name: 'Química General',
      },
    });

    await prisma.schedule.create({
      data: {
        subjectId: subject.id,
        dayOfWeek: 'FRIDAY',
        startTime: '14:00',
        endTime: '16:00',
      },
    });

    await prisma.subject.delete({ where: { id: subject.id } });

    const remainingSchedules = await prisma.schedule.findMany({
      where: { subjectId: subject.id },
    });

    expect(remainingSchedules).toHaveLength(0);
  });

  it('no permite crear un schedule con un subject inexistente', async () => {
    await expect(
      prisma.schedule.create({
        data: {
          subjectId: 'subject-que-no-existe',
          dayOfWeek: 'TUESDAY',
          startTime: '10:00',
          endTime: '12:00',
        },
      }),
    ).rejects.toThrow();
  });
});
