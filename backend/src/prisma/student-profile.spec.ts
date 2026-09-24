import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

describe('StudentProfile persistence', () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const testUserId = 'test-user-student-profile';

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {},
      create: { id: testUserId, email: '[email protected]' },
    });
  });

  afterEach(async () => {
    await prisma.studentProfile.deleteMany({ where: { userId: testUserId } });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it('crea un perfil asociado al usuario', async () => {
    const profile = await prisma.studentProfile.create({
      data: {
        userId: testUserId,
        university: 'UBA',
        career: 'Ingeniería en Informática',
        year: 3,
        campus: 'Ciudad Universitaria',
        availableSeats: null,
        questionnaireCompleted: false,
      },
    });
    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(testUserId);
    expect(profile.availableSeats).toBeNull();
  });

  it('no permite crear un segundo perfil para el mismo usuario', async () => {
    await prisma.studentProfile.create({
      data: {
        userId: testUserId,
        university: 'UBA',
        career: 'Ingeniería en Informática',
        year: 3,
        campus: 'Ciudad Universitaria',
      },
    });

    await expect(
      prisma.studentProfile.create({
        data: {
          userId: testUserId,
          university: 'UTN',
          career: 'Ingeniería en Sistemas',
          year: 1,
          campus: 'Medrano',
        },
      }),
    ).rejects.toThrow();
  });

  it('permite availableSeats con un número (equivalente a tener auto)', async () => {
    const profile = await prisma.studentProfile.create({
      data: {
        userId: testUserId,
        university: 'UBA',
        career: 'Ingeniería en Informática',
        year: 3,
        campus: 'Ciudad Universitaria',
        availableSeats: 3,
      },
    });
    expect(profile.availableSeats).toBe(3);
  });

  it('actualiza un perfil existente y refleja los cambios al volver a consultarlo', async () => {
    await prisma.studentProfile.create({
      data: {
        userId: testUserId,
        university: 'UBA',
        career: 'Ingeniería en Informática',
        year: 1,
        campus: 'Ciudad Universitaria',
      },
    });

    await prisma.studentProfile.update({
      where: { userId: testUserId },
      data: { year: 2, questionnaireCompleted: true },
    });

    const updated = await prisma.studentProfile.findUnique({
      where: { userId: testUserId },
    });

    expect(updated?.year).toBe(2);
    expect(updated?.questionnaireCompleted).toBe(true);
  });
});
