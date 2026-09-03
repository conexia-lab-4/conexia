import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SubjectsController, SchedulesController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
