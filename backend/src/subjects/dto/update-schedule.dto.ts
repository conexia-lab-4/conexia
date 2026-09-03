import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '../../../generated/prisma/client';
import { EndTimeAfterStartTime } from './end-time-after-start-time.validator';

export class UpdateScheduleDto {
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime debe tener el formato HH:mm',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime debe tener el formato HH:mm',
  })
  @EndTimeAfterStartTime()
  endTime?: string;
}
