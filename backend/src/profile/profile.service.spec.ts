import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

type StudentProfileRecord = {
  id: string;
  userId: string;
  university: string | null;
  career: string | null;
  year: number | null;
  campus: string | null;
  hasCar: boolean | null;
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
    it('devuelve el perfil cuando existe', async () => {
      const profile: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: validDto.university!,
        career: validDto.career!,
        year: validDto.year!,
        campus: validDto.campus!,
        hasCar: true,
        availableSeats: 3,
        questionnaireCompleted: true,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(profile);
      expect(prismaMock.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('devuelve hasCar en null cuando el usuario todavía no contestó esa pregunta', async () => {
      const profile: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: 'Austral',
        career: null,
        year: null,
        campus: null,
        hasCar: null,
        availableSeats: null,
        questionnaireCompleted: false,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result.hasCar).toBeNull();
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
        university: validDto.university!,
        career: validDto.career!,
        year: validDto.year!,
        campus: validDto.campus!,
        hasCar: true,
        availableSeats: 3,
        questionnaireCompleted: true,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, validDto);

      expect(result).toEqual(created);
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: validDto.university,
          career: validDto.career,
          year: validDto.year,
          campus: validDto.campus,
          hasCar: validDto.hasCar,
          availableSeats: validDto.availableSeats,
          questionnaireCompleted: validDto.questionnaireCompleted,
        },
        create: {
          userId,
          university: validDto.university,
          career: validDto.career,
          year: validDto.year,
          campus: validDto.campus,
          hasCar: validDto.hasCar,
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
        university: dto.university!,
        career: dto.career!,
        year: dto.year!,
        campus: dto.campus!,
        hasCar: false,
        availableSeats: null,
        questionnaireCompleted: dto.questionnaireCompleted ?? false,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, dto);

      expect(result).toEqual(created);
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: dto.university,
          career: dto.career,
          year: dto.year,
          campus: dto.campus,
          hasCar: false,
          availableSeats: null,
          questionnaireCompleted: dto.questionnaireCompleted,
        },
        create: {
          userId,
          university: dto.university,
          career: dto.career,
          year: dto.year,
          campus: dto.campus,
          hasCar: false,
          availableSeats: null,
          questionnaireCompleted: dto.questionnaireCompleted,
        },
      });
    });

    it('permite un guardado parcial con un solo campo (university)', async () => {
      const dto: UpsertProfileDto = { university: 'UBA' };
      const created: StudentProfileRecord = {
        id: 'profile-1',
        userId,
        university: 'UBA',
        career: null,
        year: null,
        campus: null,
        hasCar: null,
        availableSeats: null,
        questionnaireCompleted: false,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, dto);

      expect(result).toEqual(created);
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: 'UBA',
          career: undefined,
          year: undefined,
          campus: undefined,
          hasCar: undefined,
          availableSeats: undefined,
          questionnaireCompleted: undefined,
        },
        create: {
          userId,
          university: 'UBA',
          career: undefined,
          year: undefined,
          campus: undefined,
          hasCar: undefined,
          availableSeats: undefined,
          questionnaireCompleted: undefined,
        },
      });
    });

    it('no valida availableSeats si hasCar no viene en la request (guardado parcial)', async () => {
      const dto: UpsertProfileDto = { career: 'Medicina' };
      prismaMock.studentProfile.upsert.mockResolvedValue({
        id: 'profile-1',
        userId,
        university: null,
        career: 'Medicina',
        year: null,
        campus: null,
        hasCar: null,
        availableSeats: null,
        questionnaireCompleted: false,
      });

      await expect(service.upsertProfile(userId, dto)).resolves.toBeDefined();
    });
  });
});
