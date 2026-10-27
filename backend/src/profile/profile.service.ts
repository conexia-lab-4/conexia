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
    const catalog = await this.resolveCatalogSelection(userId, dto);

    const data = {
      university: dto.university,
      career: dto.career,
      year: dto.year,
      campus: dto.campus,
      hasCar: dto.hasCar,
      availableSeats,
      questionnaireCompleted: dto.questionnaireCompleted,
      carModel: dto.carModel,
      carColor: dto.carColor,
      originAddress: dto.originAddress,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      bio: dto.bio,
      detourToleranceKm: dto.detourToleranceKm,
      ...catalog,
    };

    const profile = await this.prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return profile;
  }

  // La universidad y la sede salen siempre del catálogo: nunca se crean a
  // partir de texto libre
  private async resolveCatalogSelection(userId: string, dto: UpsertProfileDto) {
    if (dto.campusId !== undefined) {
      const campus = await this.prisma.campus.findUnique({
        where: { id: dto.campusId },
        include: { university: true },
      });

      if (!campus) {
        throw new BadRequestException('La sede elegida no existe');
      }

      if (
        dto.universityId !== undefined &&
        dto.universityId !== campus.universityId
      ) {
        throw new BadRequestException(
          'La sede no pertenece a la universidad elegida',
        );
      }

      return {
        universityId: campus.universityId,
        campusId: campus.id,
        university: campus.university.name,
        campus: campus.name,
      };
    }

    if (dto.universityId === undefined) {
      return {};
    }

    const university = await this.prisma.university.findUnique({
      where: { id: dto.universityId },
    });

    if (!university) {
      throw new BadRequestException('La universidad elegida no existe');
    }

    const current = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { campusRef: { select: { universityId: true } } },
    });

    // Cambiar de universidad deja sin efecto la sede anterior
    if (current?.campusRef?.universityId === university.id) {
      return { universityId: university.id, university: university.name };
    }

    return {
      universityId: university.id,
      university: university.name,
      campusId: null,
      campus: null,
    };
  }
}
