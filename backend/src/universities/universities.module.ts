import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UniversitiesService } from './universities.service';
import { UniversitiesController } from './universities.controller';
import { CampusesController } from './campuses.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UniversitiesController, CampusesController],
  providers: [UniversitiesService],
})
export class UniversitiesModule {}
