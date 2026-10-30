import { NotFoundException } from '@nestjs/common';
import { UniversitiesService } from './universities.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UniversitiesService', () => {
  let service: UniversitiesService;
  let prismaMock: {
    university: { findMany: jest.Mock; findUnique: jest.Mock };
    campus: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prismaMock = {
      university: { findMany: jest.fn(), findUnique: jest.fn() },
      campus: { findMany: jest.fn() },
    };
    service = new UniversitiesService(prismaMock as unknown as PrismaService);
  });

  it('findAll devuelve las universidades ordenadas por nombre', async () => {
    const universities = [{ id: 'ua', name: 'Universidad Austral' }];
    prismaMock.university.findMany.mockResolvedValue(universities);

    const result = await service.findAll();

    expect(result).toEqual(universities);
    expect(prismaMock.university.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
    });
  });

  it('findCampuses devuelve solo las sedes de la universidad pedida', async () => {
    const campuses = [
      {
        id: 'ua-pilar',
        universityId: 'ua',
        name: 'Sede Pilar',
        address: 'Mariano Acosta 1611, Pilar',
        latitude: -34.451549,
        longitude: -58.862084,
      },
    ];
    prismaMock.university.findUnique.mockResolvedValue({
      id: 'ua',
      name: 'Universidad Austral',
      campuses,
    });

    const result = await service.findCampuses('ua');

    expect(result).toEqual(campuses);
    expect(prismaMock.university.findUnique).toHaveBeenCalledWith({
      where: { id: 'ua' },
      include: { campuses: { orderBy: { name: 'asc' } } },
    });
  });

  it('findCampuses lanza NotFoundException si la universidad no existe', async () => {
    prismaMock.university.findUnique.mockResolvedValue(null);

    await expect(service.findCampuses('inexistente')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('findAllCampuses devuelve todas las sedes con su universidad, ordenadas', async () => {
    const campuses = [
      {
        id: 'ua-pilar',
        universityId: 'ua',
        name: 'Sede Pilar',
        address: 'Mariano Acosta 1611, Pilar',
        latitude: -34.451549,
        longitude: -58.862084,
        university: { id: 'ua', name: 'Universidad Austral' },
      },
    ];
    prismaMock.campus.findMany.mockResolvedValue(campuses);

    const result = await service.findAllCampuses();

    expect(result).toEqual(campuses);
    expect(prismaMock.campus.findMany).toHaveBeenCalledWith({
      include: { university: { select: { id: true, name: true } } },
      orderBy: [{ university: { name: 'asc' } }, { name: 'asc' }],
    });
  });
});
