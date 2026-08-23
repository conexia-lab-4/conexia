import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

describe('Materia y Horario persistence', () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const testUserId = 'test-user-materia-horario';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: { id: testUserId, email: `${testUserId}@example.com` },
    });
  });

  afterEach(async () => {
    await prisma.materia.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('crea una materia asociada al usuario', async () => {
    const materia = await prisma.materia.create({
      data: {
        userId: testUserId,
        nombre: 'Análisis Matemático',
      },
    });

    expect(materia.id).toBeDefined();
    expect(materia.userId).toBe(testUserId);
    expect(materia.nombre).toBe('Análisis Matemático');
  });

  it('crea un horario asociado a una materia', async () => {
    const materia = await prisma.materia.create({
      data: {
        userId: testUserId,
        nombre: 'Álgebra',
      },
    });

    const horario = await prisma.horario.create({
      data: {
        materiaId: materia.id,
        diaSemana: 'LUNES',
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    });

    expect(horario.id).toBeDefined();
    expect(horario.materiaId).toBe(materia.id);
    expect(horario.diaSemana).toBe('LUNES');
  });

  it('permite que una materia tenga varios horarios', async () => {
    const materia = await prisma.materia.create({
      data: {
        userId: testUserId,
        nombre: 'Física I',
      },
    });

    await prisma.horario.create({
      data: {
        materiaId: materia.id,
        diaSemana: 'LUNES',
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    });
    await prisma.horario.create({
      data: {
        materiaId: materia.id,
        diaSemana: 'MIERCOLES',
        horaInicio: '08:00',
        horaFin: '10:00',
      },
    });

    const materiaConHorarios = await prisma.materia.findUnique({
      where: { id: materia.id },
      include: { horarios: true },
    });

    expect(materiaConHorarios?.horarios).toHaveLength(2);
  });

  it('borra los horarios en cascada al borrar la materia', async () => {
    const materia = await prisma.materia.create({
      data: {
        userId: testUserId,
        nombre: 'Química General',
      },
    });

    await prisma.horario.create({
      data: {
        materiaId: materia.id,
        diaSemana: 'VIERNES',
        horaInicio: '14:00',
        horaFin: '16:00',
      },
    });

    await prisma.materia.delete({ where: { id: materia.id } });

    const horariosRestantes = await prisma.horario.findMany({
      where: { materiaId: materia.id },
    });

    expect(horariosRestantes).toHaveLength(0);
  });

  it('no permite crear un horario con una materia inexistente', async () => {
    await expect(
      prisma.horario.create({
        data: {
          materiaId: 'materia-que-no-existe',
          diaSemana: 'MARTES',
          horaInicio: '10:00',
          horaFin: '12:00',
        },
      }),
    ).rejects.toThrow();
  });
});
