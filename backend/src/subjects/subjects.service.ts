import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

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
}
