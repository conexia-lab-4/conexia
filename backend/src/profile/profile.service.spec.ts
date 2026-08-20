import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: {
    studentProfile: { findUnique: jest.Mock; upsert: jest.Mock };
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
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    service = new ProfileService(prismaMock as unknown as PrismaService);
  });

  describe('getProfile', () => {
    it('devuelve el perfil cuando existe', async () => {
      const profile = { id: 'profile-1', userId, ...validDto };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual(profile);
      expect(prismaMock.studentProfile.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('lanza NotFoundException cuando el usuario no tiene perfil', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertProfile', () => {
    it('crea/actualiza el perfil con datos válidos', async () => {
      const created = { id: 'profile-1', userId, ...validDto };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, validDto);

      expect(result).toEqual(created);
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: expect.objectContaining({ availableSeats: 3 }),
        create: expect.objectContaining({ userId, availableSeats: 3 }),
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
      prismaMock.studentProfile.upsert.mockResolvedValue({
        id: 'profile-1',
        userId,
        ...dto,
        availableSeats: null,
      });

      await service.upsertProfile(userId, dto);

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: expect.objectContaining({ availableSeats: null }),
        create: expect.objectContaining({ availableSeats: null }),
      });
    });
  });
});
