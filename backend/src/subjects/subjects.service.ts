import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubjectDto) {
    const schedulesData = dto.schedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      classroom: schedule.classroom,
    }));

    return this.prisma.subject.create({
      data: {
        userId,
        name: dto.name,
        color: dto.color,
        visibleProfile: dto.visibleProfile,
        schedules: { create: schedulesData },
      },
      include: { schedules: true },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.subject.findMany({
      where: { userId },
      include: { schedules: true },
    });
  }

  async updateSubject(
    userId: string,
    subjectId: string,
    dto: UpdateSubjectDto,
  ) {
    await this.findOwnedSubjectOrThrow(userId, subjectId);

    return this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: dto.name,
        color: dto.color,
        visibleProfile: dto.visibleProfile,
      },
      include: { schedules: true },
    });
  }

  async removeSubject(userId: string, subjectId: string) {
    const subject = await this.findOwnedSubjectOrThrow(userId, subjectId);

    // Dos altas separadas con el mismo nombre representan la misma materia
    // para el usuario, así que "eliminar materia" las borra a todas.
    await this.prisma.subject.deleteMany({
      where: { userId, name: subject.name },
    });
  }

  async updateSchedule(
    userId: string,
    scheduleId: string,
    dto: UpdateScheduleDto,
  ) {
    const schedule = await this.findOwnedScheduleOrThrow(userId, scheduleId);

    const startTime = dto.startTime ?? schedule.startTime;
    const endTime = dto.endTime ?? schedule.endTime;

    return this.prisma.schedule.update({
      where: { id: scheduleId },
      data: {
        dayOfWeek: dto.dayOfWeek ?? schedule.dayOfWeek,
        startTime,
        endTime,
        classroom: dto.classroom ?? schedule.classroom,
      },
    });
  }

  async removeSchedule(userId: string, scheduleId: string) {
    const schedule = await this.findOwnedScheduleOrThrow(userId, scheduleId);

    await this.prisma.$transaction(async (tx) => {
      await tx.schedule.delete({ where: { id: scheduleId } });

      const remainingSchedules = await tx.schedule.count({
        where: { subjectId: schedule.subjectId },
      });

      if (remainingSchedules === 0) {
        await tx.subject.delete({ where: { id: schedule.subjectId } });
      }
    });
  }

  private async findOwnedSubjectOrThrow(userId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });

    if (!subject) {
      throw new NotFoundException('La materia no existe');
    }

    return subject;
  }

  private async findOwnedScheduleOrThrow(userId: string, scheduleId: string) {
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, subject: { userId } },
    });

    if (!schedule) {
      throw new NotFoundException('El horario no existe');
    }

    return schedule;
  }
}
