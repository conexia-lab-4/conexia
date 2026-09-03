import { NotFoundException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

type SubjectRecord = {
  id: string;
  userId: string;
  name: string;
  schedules?: ScheduleRecord[];
};

type ScheduleRecord = {
  id: string;
  subjectId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

describe('SubjectsService', () => {
  let service: SubjectsService;
  let prismaMock: {
    subject: {
      create: jest.Mock<Promise<SubjectRecord>, [unknown]>;
      findMany: jest.Mock<Promise<SubjectRecord[]>, [unknown]>;
      findFirst: jest.Mock<Promise<SubjectRecord | null>, [unknown]>;
      update: jest.Mock<Promise<SubjectRecord>, [unknown]>;
      delete: jest.Mock<Promise<SubjectRecord>, [unknown]>;
    };
    schedule: {
      findFirst: jest.Mock<Promise<ScheduleRecord | null>, [unknown]>;
      update: jest.Mock<Promise<ScheduleRecord>, [unknown]>;
      delete: jest.Mock<Promise<ScheduleRecord>, [unknown]>;
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
        findFirst: jest.fn<Promise<SubjectRecord | null>, [unknown]>(),
        update: jest.fn<Promise<SubjectRecord>, [unknown]>(),
        delete: jest.fn<Promise<SubjectRecord>, [unknown]>(),
      },
      schedule: {
        findFirst: jest.fn<Promise<ScheduleRecord | null>, [unknown]>(),
        update: jest.fn<Promise<ScheduleRecord>, [unknown]>(),
        delete: jest.fn<Promise<ScheduleRecord>, [unknown]>(),
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
  });

  describe('findAllByUser', () => {
    it('devuelve las materias del usuario', async () => {
      const subjects: SubjectRecord[] = [
        { id: 'subject-1', userId, name: 'Análisis Matemático', schedules: [] },
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

  describe('updateSubject', () => {
    const dto: UpdateSubjectDto = { name: 'Análisis II' };

    it('actualiza el nombre cuando la materia le pertenece al usuario', async () => {
      const owned: SubjectRecord = {
        id: 'subject-1',
        userId,
        name: 'Análisis Matemático',
      };
      const updated: SubjectRecord = {
        id: 'subject-1',
        userId,
        name: dto.name,
        schedules: [],
      };
      prismaMock.subject.findFirst.mockResolvedValue(owned);
      prismaMock.subject.update.mockResolvedValue(updated);

      const result = await service.updateSubject(userId, 'subject-1', dto);

      expect(result).toEqual(updated);
      expect(prismaMock.subject.findFirst).toHaveBeenCalledWith({
        where: { id: 'subject-1', userId },
      });
      expect(prismaMock.subject.update).toHaveBeenCalledWith({
        where: { id: 'subject-1' },
        data: { name: dto.name },
        include: { schedules: true },
      });
    });

    it('lanza NotFoundException cuando la materia no existe o no le pertenece', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSubject(userId, 'subject-ajeno', dto),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.subject.update).not.toHaveBeenCalled();
    });
  });

  describe('removeSubject', () => {
    it('elimina la materia cuando le pertenece al usuario', async () => {
      const owned: SubjectRecord = {
        id: 'subject-1',
        userId,
        name: 'Análisis Matemático',
      };
      prismaMock.subject.findFirst.mockResolvedValue(owned);
      prismaMock.subject.delete.mockResolvedValue(owned);

      await service.removeSubject(userId, 'subject-1');

      expect(prismaMock.subject.delete).toHaveBeenCalledWith({
        where: { id: 'subject-1' },
      });
    });

    it('lanza NotFoundException cuando la materia no existe o no le pertenece', async () => {
      prismaMock.subject.findFirst.mockResolvedValue(null);

      await expect(
        service.removeSubject(userId, 'subject-ajeno'),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.subject.delete).not.toHaveBeenCalled();
    });
  });

  describe('updateSchedule', () => {
    const owned: ScheduleRecord = {
      id: 'schedule-1',
      subjectId: 'subject-1',
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '10:00',
    };

    it('actualiza el horario cuando le pertenece al usuario', async () => {
      const dto: UpdateScheduleDto = { startTime: '09:00' };
      const updated: ScheduleRecord = { ...owned, startTime: '09:00' };
      prismaMock.schedule.findFirst.mockResolvedValue(owned);
      prismaMock.schedule.update.mockResolvedValue(updated);

      const result = await service.updateSchedule(userId, 'schedule-1', dto);

      expect(result).toEqual(updated);
      expect(prismaMock.schedule.findFirst).toHaveBeenCalledWith({
        where: { id: 'schedule-1', subject: { userId } },
      });
      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: {
          dayOfWeek: owned.dayOfWeek,
          startTime: '09:00',
          endTime: owned.endTime,
        },
      });
    });

    it('mantiene los valores existentes cuando el DTO no manda un campo', async () => {
      const dto: UpdateScheduleDto = {};
      prismaMock.schedule.findFirst.mockResolvedValue(owned);
      prismaMock.schedule.update.mockResolvedValue(owned);

      await service.updateSchedule(userId, 'schedule-1', dto);

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
        data: {
          dayOfWeek: owned.dayOfWeek,
          startTime: owned.startTime,
          endTime: owned.endTime,
        },
      });
    });

    it('lanza NotFoundException cuando el horario no existe o no le pertenece', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSchedule(userId, 'schedule-ajeno', {}),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.schedule.update).not.toHaveBeenCalled();
    });
  });

  describe('removeSchedule', () => {
    const owned: ScheduleRecord = {
      id: 'schedule-1',
      subjectId: 'subject-1',
      dayOfWeek: 'MONDAY',
      startTime: '08:00',
      endTime: '10:00',
    };

    it('elimina el horario cuando le pertenece al usuario', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(owned);
      prismaMock.schedule.delete.mockResolvedValue(owned);

      await service.removeSchedule(userId, 'schedule-1');

      expect(prismaMock.schedule.delete).toHaveBeenCalledWith({
        where: { id: 'schedule-1' },
      });
    });

    it('lanza NotFoundException cuando el horario no existe o no le pertenece', async () => {
      prismaMock.schedule.findFirst.mockResolvedValue(null);

      await expect(
        service.removeSchedule(userId, 'schedule-ajeno'),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.schedule.delete).not.toHaveBeenCalled();
    });
  });
});
