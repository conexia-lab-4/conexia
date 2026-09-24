import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  carModel?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  carColor?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  originAddress?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
