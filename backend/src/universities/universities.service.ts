import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.university.findMany({ orderBy: { name: 'asc' } });
  }

  async findCampuses(universityId: string) {
    const university = await this.prisma.university.findUnique({
      where: { id: universityId },
      include: { campuses: { orderBy: { name: 'asc' } } },
    });

    if (!university) {
      throw new NotFoundException('La universidad no existe');
    }

    return university.campuses;
  }
}
