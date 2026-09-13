import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SubjectColor } from '../../../generated/prisma/client';

export class UpdateSubjectDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(SubjectColor)
  color?: SubjectColor;

  @IsOptional()
  @IsBoolean()
  visibleProfile?: boolean;
}
