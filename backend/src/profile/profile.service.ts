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
}
