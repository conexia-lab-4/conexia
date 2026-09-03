import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpsertProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  university?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  career?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  year?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campus?: string;

  @IsOptional()
  @IsBoolean()
  hasCar?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableSeats?: number;

  @IsOptional()
  @IsBoolean()
  questionnaireCompleted?: boolean;
}
