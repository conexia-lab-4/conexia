import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('El usuario todavía no completó su perfil');
    }

    return profile;
  }

  async upsertProfile(userId: string, dto: UpsertProfileDto) {
    if (dto.hasCar && dto.availableSeats === undefined) {
      throw new BadRequestException(
        'availableSeats es requerido cuando hasCar es true',
      );
    }

    if (!dto.hasCar && dto.availableSeats !== undefined) {
      throw new BadRequestException(
        'availableSeats debe omitirse cuando hasCar es false',
      );
    }

    return this.prisma.studentProfile.upsert({
      where: { userId },
      update: {
        university: dto.university,
        career: dto.career,
        year: dto.year,
        campus: dto.campus,
        hasCar: dto.hasCar,
        availableSeats: dto.hasCar ? dto.availableSeats : null,
        questionnaireCompleted: dto.questionnaireCompleted ?? false,
      },
      create: {
        userId,
        university: dto.university,
        career: dto.career,
        year: dto.year,
        campus: dto.campus,
        hasCar: dto.hasCar,
        availableSeats: dto.hasCar ? dto.availableSeats : null,
        questionnaireCompleted: dto.questionnaireCompleted ?? false,
      },
    });
  }
}
