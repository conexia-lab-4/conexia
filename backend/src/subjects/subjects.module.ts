import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { SchedulesController } from './schedules.controller';
import { ScheduleExtractionService } from './schedule-extraction.service';

@Module({
  imports: [PrismaModule],
  controllers: [SubjectsController, SchedulesController],
  providers: [SubjectsService, ScheduleExtractionService],
})
export class SubjectsModule {}
