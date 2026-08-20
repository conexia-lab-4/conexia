import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpsertProfileDto {
  @IsString()
  @IsNotEmpty()
  university: string;

  @IsString()
  @IsNotEmpty()
  career: string;

  @IsInt()
  @Min(1)
  year: number;

  @IsString()
  @IsNotEmpty()
  campus: string;

  @IsBoolean()
  hasCar: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  availableSeats?: number;

  @IsOptional()
  @IsBoolean()
  questionnaireCompleted?: boolean;
}
