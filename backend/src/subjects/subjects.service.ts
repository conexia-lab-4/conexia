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
    }));

    return this.prisma.subject.create({
      data: {
        userId,
        name: dto.name,
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
      data: { name: dto.name },
      include: { schedules: true },
    });
  }

  async removeSubject(userId: string, subjectId: string) {
    await this.findOwnedSubjectOrThrow(userId, subjectId);

    await this.prisma.subject.delete({ where: { id: subjectId } });
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
      },
    });
  }

  async removeSchedule(userId: string, scheduleId: string) {
    await this.findOwnedScheduleOrThrow(userId, scheduleId);

    await this.prisma.schedule.delete({ where: { id: scheduleId } });
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
