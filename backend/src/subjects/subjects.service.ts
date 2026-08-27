import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSubjectDto) {
    for (const schedule of dto.schedules) {
      if (schedule.startTime >= schedule.endTime) {
        throw new BadRequestException(
          'startTime debe ser anterior a endTime en cada horario',
        );
      }
    }

    return this.prisma.subject.create({
      data: {
        userId,
        name: dto.name,
        schedules: {
          create: dto.schedules.map((schedule) => ({
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        },
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
