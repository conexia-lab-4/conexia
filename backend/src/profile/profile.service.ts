import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvatarStorageService } from '../firebase/avatar-storage.service';
import { DisplayNamesService } from '../firebase/display-names.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatarStorage: AvatarStorageService,
    private readonly displayNames: DisplayNamesService,
  ) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('El usuario todavía no completó su perfil');
    }

    return this.withPhoto(profile);
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
    // Con IDs, los nombres salen del catálogo; sin IDs, no pueden contradecirlo
    const names =
      'universityId' in catalog ? {} : await this.resolveNames(userId, dto);

    const data = {
      career: dto.career,
      year: dto.year,
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
      ...names,
    };

    const profile = await this.prisma.studentProfile.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    return this.withPhoto(profile);
  }

  async updatePhoto(userId: string, photo: Express.Multer.File) {
    const photoUrl = await this.avatarStorage.uploadAvatar(userId, photo);
    return { photoUrl };
  }

  // La foto vive en Firebase Auth; sin foto (o si Firebase falla) queda null
  private async withPhoto<T extends { userId: string }>(profile: T) {
    const users = await this.displayNames.getPublicUsers([profile.userId]);
    return {
      ...profile,
      photoUrl: users.get(profile.userId)?.photoUrl ?? null,
    };
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

  // Sin IDs en el pedido, los nombres escritos no pueden contradecir al
  // catálogo: si el perfil ya eligió universidad o sede del catálogo, tienen
  // que coincidir con los nombres canónicos
  private async resolveNames(userId: string, dto: UpsertProfileDto) {
    if (dto.university === undefined && dto.campus === undefined) {
      return {};
    }

    const current = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        universityRef: { select: { name: true } },
        campusRef: { select: { name: true } },
      },
    });

    // Perfiles anteriores al catálogo: se conserva el texto como siempre
    if (!current?.universityRef) {
      return { university: dto.university, campus: dto.campus };
    }

    if (
      dto.university !== undefined &&
      dto.university !== current.universityRef.name
    ) {
      throw new BadRequestException(
        'El nombre de la universidad no coincide con la elegida del catálogo',
      );
    }

    if (dto.campus !== undefined && dto.campus !== current.campusRef?.name) {
      throw new BadRequestException(
        'El nombre de la sede no coincide con la elegida del catálogo',
      );
    }

    return {};
  }
}
