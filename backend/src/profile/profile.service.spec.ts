import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { AvatarStorageService } from '../firebase/avatar-storage.service';
import {
  DisplayNamesService,
  type PublicUser,
} from '../firebase/display-names.service';

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
  carModel: string | null;
  carColor: string | null;
  originAddress: string | null;
  phone: string | null;
  birthDate: Date | null;
  bio: string | null;
  detourToleranceKm: number | null;
};

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaMock: {
    studentProfile: {
      findUnique: jest.Mock<Promise<StudentProfileRecord | null>, [unknown]>;
      upsert: jest.Mock<Promise<StudentProfileRecord>, [unknown]>;
    };
    campus: { findUnique: jest.Mock };
    university: { findUnique: jest.Mock };
  };
  let avatarStorageMock: { uploadAvatar: jest.Mock };
  let displayNamesMock: { getPublicUsers: jest.Mock };
  const userId = 'user-123';

  const validDto: UpsertProfileDto = {
    university: 'Austral',
    career: 'Ingeniería en Informática',
    year: 3,
    campus: 'Pilar',
    hasCar: true,
    availableSeats: 3,
    questionnaireCompleted: true,
    carModel: 'Toyota Corolla',
    carColor: 'Blanco',
    originAddress: 'Av. Directorio 1234',
    phone: '+5491122334455',
    birthDate: '2000-05-15',
    bio: 'Estudiante de segundo año.',
    detourToleranceKm: 5,
  };

  beforeEach(() => {
    prismaMock = {
      studentProfile: {
        findUnique: jest.fn<Promise<StudentProfileRecord | null>, [unknown]>(),
        upsert: jest.fn<Promise<StudentProfileRecord>, [unknown]>(),
      },
      campus: { findUnique: jest.fn() },
      university: { findUnique: jest.fn() },
    };
    avatarStorageMock = { uploadAvatar: jest.fn() };
    displayNamesMock = {
      getPublicUsers: jest
        .fn()
        .mockResolvedValue(new Map<string, PublicUser>()),
    };
    service = new ProfileService(
      prismaMock as unknown as PrismaService,
      avatarStorageMock as unknown as AvatarStorageService,
      displayNamesMock as unknown as DisplayNamesService,
    );
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
        carModel: validDto.carModel!,
        carColor: validDto.carColor!,
        originAddress: validDto.originAddress!,
        phone: validDto.phone!,
        birthDate: new Date(validDto.birthDate!),
        bio: validDto.bio!,
        detourToleranceKm: validDto.detourToleranceKm!,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result).toEqual({ ...profile, photoUrl: null });
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
        carModel: null,
        carColor: null,
        originAddress: null,
        phone: null,
        birthDate: null,
        bio: null,
        detourToleranceKm: null,
      };
      prismaMock.studentProfile.findUnique.mockResolvedValue(profile);

      const result = await service.getProfile(userId);

      expect(result.hasCar).toBeNull();
    });

    it('incluye la foto del usuario cuando tiene una', async () => {
      prismaMock.studentProfile.findUnique.mockResolvedValue({
        id: 'profile-1',
        userId,
      } as StudentProfileRecord);
      displayNamesMock.getPublicUsers.mockResolvedValue(
        new Map([[userId, { displayName: null, photoUrl: 'https://foto/u' }]]),
      );

      const result = await service.getProfile(userId);

      expect(result.photoUrl).toBe('https://foto/u');
      expect(displayNamesMock.getPublicUsers).toHaveBeenCalledWith([userId]);
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
        carModel: validDto.carModel!,
        carColor: validDto.carColor!,
        originAddress: validDto.originAddress!,
        phone: validDto.phone!,
        birthDate: new Date(validDto.birthDate!),
        bio: validDto.bio!,
        detourToleranceKm: validDto.detourToleranceKm!,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, validDto);

      expect(result).toEqual({ ...created, photoUrl: null });
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
          carModel: validDto.carModel,
          carColor: validDto.carColor,
          originAddress: validDto.originAddress,
          phone: validDto.phone,
          birthDate: new Date(validDto.birthDate!),
          bio: validDto.bio,
          detourToleranceKm: validDto.detourToleranceKm,
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
          carModel: validDto.carModel,
          carColor: validDto.carColor,
          originAddress: validDto.originAddress,
          phone: validDto.phone,
          birthDate: new Date(validDto.birthDate!),
          bio: validDto.bio,
          detourToleranceKm: validDto.detourToleranceKm,
        },
      });
    });

    it('guarda detourToleranceKm en 0 sin tratarlo como vacío', async () => {
      const dto: UpsertProfileDto = { detourToleranceKm: 0 };
      prismaMock.studentProfile.upsert.mockResolvedValue({
        id: 'profile-1',
        userId,
        university: null,
        career: null,
        year: null,
        campus: null,
        hasCar: null,
        availableSeats: null,
        questionnaireCompleted: false,
        carModel: null,
        carColor: null,
        originAddress: null,
        phone: null,
        birthDate: null,
        bio: null,
        detourToleranceKm: 0,
      });

      await service.upsertProfile(userId, dto);
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          university: undefined,
          career: undefined,
          year: undefined,
          campus: undefined,
          hasCar: undefined,
          availableSeats: undefined,
          questionnaireCompleted: undefined,
          carModel: undefined,
          carColor: undefined,
          originAddress: undefined,
          neighborhood: undefined,
          phone: undefined,
          birthDate: undefined,
          bio: undefined,
          detourToleranceKm: 0,
        },
        create: {
          userId,
          university: undefined,
          career: undefined,
          year: undefined,
          campus: undefined,
          hasCar: undefined,
          availableSeats: undefined,
          questionnaireCompleted: undefined,
          carModel: undefined,
          carColor: undefined,
          originAddress: undefined,
          neighborhood: undefined,
          phone: undefined,
          birthDate: undefined,
          bio: undefined,
          detourToleranceKm: 0,
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
        carModel: dto.carModel!,
        carColor: dto.carColor!,
        originAddress: dto.originAddress!,
        phone: dto.phone!,
        birthDate: new Date(dto.birthDate!),
        bio: dto.bio!,
        detourToleranceKm: dto.detourToleranceKm!,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, dto);

      expect(result).toEqual({ ...created, photoUrl: null });
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
          carModel: dto.carModel,
          carColor: dto.carColor,
          originAddress: dto.originAddress,
          phone: dto.phone,
          birthDate: new Date(dto.birthDate!),
          bio: dto.bio,
          detourToleranceKm: dto.detourToleranceKm,
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
          carModel: dto.carModel,
          carColor: dto.carColor,
          originAddress: dto.originAddress,
          phone: dto.phone,
          birthDate: new Date(dto.birthDate!),
          bio: dto.bio,
          detourToleranceKm: dto.detourToleranceKm,
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
        carModel: null,
        carColor: null,
        originAddress: null,
        phone: null,
        birthDate: null,
        bio: null,
        detourToleranceKm: null,
      };
      prismaMock.studentProfile.upsert.mockResolvedValue(created);

      const result = await service.upsertProfile(userId, dto);

      expect(result).toEqual({ ...created, photoUrl: null });
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
          carModel: undefined,
          carColor: undefined,
          originAddress: undefined,
          phone: undefined,
          birthDate: undefined,
          bio: undefined,
          detourToleranceKm: undefined,
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
          carModel: undefined,
          carColor: undefined,
          originAddress: undefined,
          phone: undefined,
          birthDate: undefined,
          bio: undefined,
          detourToleranceKm: undefined,
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
        carModel: null,
        carColor: null,
        originAddress: null,
        phone: null,
        birthDate: null,
        bio: null,
        detourToleranceKm: null,
      });

      await expect(service.upsertProfile(userId, dto)).resolves.toBeDefined();
    });
  });

  describe('upsertProfile con catálogo de universidades', () => {
    const austral = { id: 'ua', name: 'Universidad Austral' };
    const pilar = {
      id: 'ua-pilar',
      universityId: 'ua',
      name: 'Sede Pilar',
      university: austral,
    };
    const savedProfile: StudentProfileRecord = {
      id: 'profile-1',
      userId,
      university: null,
      career: null,
      year: null,
      campus: null,
      hasCar: null,
      availableSeats: null,
      questionnaireCompleted: false,
      carModel: null,
      carColor: null,
      originAddress: null,
      phone: null,
      birthDate: null,
      bio: null,
      detourToleranceKm: null,
    };
    // Perfil actual del usuario con una sede de la universidad indicada
    const currentProfileWithCampusOf = (universityId: string | null) =>
      ({
        campusRef: universityId ? { universityId } : null,
      }) as unknown as StudentProfileRecord;

    beforeEach(() => {
      prismaMock.studentProfile.upsert.mockResolvedValue(savedProfile);
    });

    it('guarda universidad y sede del catálogo y completa los textos con sus nombres', async () => {
      prismaMock.campus.findUnique.mockResolvedValue(pilar);

      await service.upsertProfile(userId, {
        universityId: 'ua',
        campusId: 'ua-pilar',
      });

      expect(prismaMock.campus.findUnique).toHaveBeenCalledWith({
        where: { id: 'ua-pilar' },
        include: { university: true },
      });
      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
        create: {
          userId,
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
      });
    });

    it('deduce la universidad cuando solo llega la sede', async () => {
      prismaMock.campus.findUnique.mockResolvedValue(pilar);

      await service.upsertProfile(userId, { campusId: 'ua-pilar' });

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
        create: {
          userId,
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
      });
    });

    it('los nombres del catálogo pisan los textos enviados en la misma request', async () => {
      prismaMock.campus.findUnique.mockResolvedValue(pilar);

      await service.upsertProfile(userId, {
        university: 'Otra',
        campus: 'Otra sede',
        campusId: 'ua-pilar',
      });

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
        create: {
          userId,
          universityId: 'ua',
          campusId: 'ua-pilar',
          university: 'Universidad Austral',
          campus: 'Sede Pilar',
        },
      });
    });

    it('rechaza una sede que no existe', async () => {
      prismaMock.campus.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertProfile(userId, { campusId: 'no-existe' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.studentProfile.upsert).not.toHaveBeenCalled();
    });

    it('rechaza una sede que no pertenece a la universidad elegida', async () => {
      prismaMock.campus.findUnique.mockResolvedValue(pilar);

      await expect(
        service.upsertProfile(userId, {
          universityId: 'uba',
          campusId: 'ua-pilar',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.studentProfile.upsert).not.toHaveBeenCalled();
    });

    it('rechaza una universidad que no existe', async () => {
      prismaMock.university.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertProfile(userId, { universityId: 'no-existe' }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.studentProfile.upsert).not.toHaveBeenCalled();
    });

    it('borra la sede cuando se elige solo la universidad y el perfil no tenía sede', async () => {
      prismaMock.university.findUnique.mockResolvedValue(austral);
      prismaMock.studentProfile.findUnique.mockResolvedValue(
        currentProfileWithCampusOf(null),
      );

      await service.upsertProfile(userId, { universityId: 'ua' });

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          universityId: 'ua',
          university: 'Universidad Austral',
          campusId: null,
          campus: null,
        },
        create: {
          userId,
          universityId: 'ua',
          university: 'Universidad Austral',
          campusId: null,
          campus: null,
        },
      });
    });

    it('borra la sede cuando la sede actual es de otra universidad', async () => {
      prismaMock.university.findUnique.mockResolvedValue(austral);
      prismaMock.studentProfile.findUnique.mockResolvedValue(
        currentProfileWithCampusOf('uba'),
      );

      await service.upsertProfile(userId, { universityId: 'ua' });

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          universityId: 'ua',
          university: 'Universidad Austral',
          campusId: null,
          campus: null,
        },
        create: {
          userId,
          universityId: 'ua',
          university: 'Universidad Austral',
          campusId: null,
          campus: null,
        },
      });
    });

    it('conserva la sede cuando es de la misma universidad que se elige', async () => {
      prismaMock.university.findUnique.mockResolvedValue(austral);
      prismaMock.studentProfile.findUnique.mockResolvedValue(
        currentProfileWithCampusOf('ua'),
      );

      await service.upsertProfile(userId, { universityId: 'ua' });

      expect(prismaMock.studentProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { universityId: 'ua', university: 'Universidad Austral' },
        create: {
          userId,
          universityId: 'ua',
          university: 'Universidad Austral',
        },
      });
    });
  });

  describe('updatePhoto', () => {
    it('sube la foto como avatar del usuario y devuelve su URL', async () => {
      const photo = { buffer: Buffer.from('img') } as Express.Multer.File;
      avatarStorageMock.uploadAvatar.mockResolvedValue('https://foto/nueva');

      const result = await service.updatePhoto(userId, photo);

      expect(avatarStorageMock.uploadAvatar).toHaveBeenCalledWith(
        userId,
        photo,
      );
      expect(result).toEqual({ photoUrl: 'https://foto/nueva' });
    });
  });
});
