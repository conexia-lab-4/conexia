import { BadRequestException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

type SubjectRecord = {
  id: string;
  userId: string;
  name: string;
  schedules: {
    id: string;
    subjectId: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];
};

describe('SubjectsService', () => {
  let service: SubjectsService;
  let prismaMock: {
    subject: {
      create: jest.Mock<Promise<SubjectRecord>, [unknown]>;
      findMany: jest.Mock<Promise<SubjectRecord[]>, [unknown]>;
    };
  };
  const userId = 'user-123';

  const validDto: CreateSubjectDto = {
    name: 'Análisis Matemático',
    schedules: [
      { dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '10:00' },
      { dayOfWeek: 'WEDNESDAY', startTime: '08:00', endTime: '10:00' },
    ],
  };

  beforeEach(() => {
    prismaMock = {
      subject: {
        create: jest.fn<Promise<SubjectRecord>, [unknown]>(),
        findMany: jest.fn<Promise<SubjectRecord[]>, [unknown]>(),
      },
    };
    service = new SubjectsService(prismaMock as unknown as PrismaService);
  });

  describe('create', () => {
    it('crea una materia con sus horarios', async () => {
      const created: SubjectRecord = {
        id: 'subject-1',
        userId,
        name: validDto.name,
        schedules: validDto.schedules.map((s, i) => ({
          id: `schedule-${i}`,
          subjectId: 'subject-1',
          ...s,
        })),
      };
      prismaMock.subject.create.mockResolvedValue(created);

      const result = await service.create(userId, validDto);

      expect(result).toEqual(created);
      expect(prismaMock.subject.create).toHaveBeenCalledWith({
        data: {
          userId,
          name: validDto.name,
          schedules: {
            create: validDto.schedules.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          },
        },
        include: { schedules: true },
      });
    });

    it('rechaza cuando un horario tiene startTime posterior o igual a endTime', async () => {
      const dto: CreateSubjectDto = {
        name: 'Física I',
        schedules: [
          { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '08:00' },
        ],
      };

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.subject.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllByUser', () => {
    it('devuelve las materias del usuario', async () => {
      const subjects: SubjectRecord[] = [
        {
          id: 'subject-1',
          userId,
          name: 'Análisis Matemático',
          schedules: [],
        },
      ];
      prismaMock.subject.findMany.mockResolvedValue(subjects);

      const result = await service.findAllByUser(userId);

      expect(result).toEqual(subjects);
      expect(prismaMock.subject.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { schedules: true },
      });
    });
  });
});
