import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SubjectColor } from '../../../generated/prisma/client';
import { CreateScheduleDto } from './create-schedule.dto';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(SubjectColor)
  color!: SubjectColor;

  @IsOptional()
  @IsBoolean()
  visibleProfile?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules!: CreateScheduleDto[];
}
