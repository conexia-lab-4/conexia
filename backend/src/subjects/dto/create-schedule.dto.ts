import { IsEnum, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/client';

export class CreateScheduleDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener el formato HH:mm',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime debe tener el formato HH:mm',
  })
  endTime!: string;
}
