import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

type StudentProfileRecord = {
  id: string;
  userId: string;
  university: string;
  career: string;
  year: number;
  campus: string;
  availableSeats: number | null;
  questionnaireCompleted: boolean;
};

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: {
    studentProfile: {
      findUnique: jest.Mock<Promise<StudentProfileRecord | null>, [unknown]>;
      upsert: jest.Mock<Promise<StudentProfileRecord>, [unknown]>;
    };
  };
  const userId = 'user-123';

  const validDto: UpsertProfileDto = {
    university: 'Austral',
    career: 'Ingeniería en Informática',
    year: 3,
    campus: 'Pilar',
    hasCar: true,
    availableSeats: 3,
    questionnaireCompleted: true,
  };

  beforeEach(() => {
    prismaMock = {
      studentProfile: {
        findUnique: jest.fn<Promise<StudentProfileRecord | null>, [unknown]>(),
        upsert: jest.fn<Promise<StudentProfileRecord>, [unknown]>(),
      },
    };
    service = new ProfileService(prismaMock as unknown as PrismaService);
  });

  describe('getProfile', () => {
    it('devuelve el perfil cuando existe, con hasCar calculado', async () => {
      const profile: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: validDto.university,
        career: validDto.career,
        year: validDto.year,
        campus: validDto.campus,
        availableSeats: 3,
        questionnaireCompleted: true,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual({ ...profile, hasCar: true });
      expect(prismaMock.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('calcula hasCar en false cuando availableSeats es null', async () => {
      const profile: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: validDto.university,
        career: validDto.career,
        year: validDto.year,
        campus: validDto.campus,
        availableSeats: null,
        questionnaireCompleted: true,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual({ ...profile, hasCar: false });
    });

    it('lanza NotFoundException cuando el usuario no tiene perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertProfile', () => {
    it('crea/actualiza el perfil con datos válidos', async () => {
      const created: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: validDto.university,
        career: validDto.career,
        year: validDto.year,
        campus: validDto.campus,
        availableSeats: 3,
        questionnaireCompleted: true,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, validDto);

      expect(result).toEqual({ ...created, hasCar: true });
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: validDto.university,
          career: validDto.career,
          year: validDto.year,
          campus: validDto.campus,
          availableSeats: validDto.availableSeats,
          questionnaireCompleted: validDto.questionnaireCompleted,
        },
        create: {
          userId,
          university: validDto.university,
          career: validDto.career,
          year: validDto.year,
          campus: validDto.campus,
          availableSeats: validDto.availableSeats,
          questionnaireCompleted: validDto.questionnaireCompleted,
        },
      });
    });

    it('rechaza cuando hasCar es true sin availableSeats', async () => {
      const dto = { ...validDto, hasCar: true, availableSeats: undefined };

      await expect(service.upsertProfile(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.studentProfile.upsert).not.toHaveBeenCalled();
    });

    it('rechaza cuando hasCar es false pero se manda availableSeats', async () => {
      const dto = { ...validDto, hasCar: false, availableSeats: 2 };

      await expect(service.upsertProfile(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.studentProfile.upsert).not.toHaveBeenCalled();
    });

    it('guarda availableSeats en null cuando hasCar es false', async () => {
      const dto = { ...validDto, hasCar: false, availableSeats: undefined };
      const created: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: dto.university,
        career: dto.career,
        year: dto.year,
        campus: dto.campus,
        availableSeats: null,
        questionnaireCompleted: dto.questionnaireCompleted ?? false,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, dto);

      expect(result).toEqual({ ...created, hasCar: false });
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: dto.university,
          career: dto.career,
          year: dto.year,
          campus: dto.campus,
          availableSeats: null,
          questionnaireCompleted: dto.questionnaireCompleted,
        },
        create: {
          userId,
          university: dto.university,
          career: dto.career,
          year: dto.year,
          campus: dto.campus,
          availableSeats: null,
          questionnaireCompleted: dto.questionnaireCompleted,
        },
      });
    });
  });
});
