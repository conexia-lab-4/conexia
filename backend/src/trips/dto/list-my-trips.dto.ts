import { IsIn, IsOptional } from 'class-validator';

export const TRIP_SCOPES = ['upcoming', 'history'] as const;
export type TripScope = (typeof TRIP_SCOPES)[number];

export class ListMyTripsDto {
  @IsOptional()
  @IsIn([...TRIP_SCOPES])
  scope?: TripScope;
}
