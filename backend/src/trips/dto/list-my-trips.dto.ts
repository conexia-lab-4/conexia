import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const TRIP_SCOPES = ['upcoming', 'history'] as const;
export type TripScope = (typeof TRIP_SCOPES)[number];

export class ListMyTripsDto {
  @IsOptional()
  @IsIn([...TRIP_SCOPES])
  scope?: TripScope;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
