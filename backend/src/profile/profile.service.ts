import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
    if (dto.hasCar === true && dto.availableSeats === undefined) {
      throw new BadRequestException(
        'availableSeats es requerido cuando hasCar es true',
      );
    }

    if (dto.hasCar === false && dto.availableSeats !== undefined) {
      throw new BadRequestException(
        'availableSeats debe omitirse cuando hasCar es false',
      );
    }

    const availableSeats = dto.hasCar === false ? null : dto.availableSeats;

    const data = {
      university: dto.university,
      career: dto.career,
      year: dto.year,
      campus: dto.campus,
      hasCar: dto.hasCar,
      availableSeats,
      questionnaireCompleted: dto.questionnaireCompleted,
    };

    const profile = await this.prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return profile;
  }
}
