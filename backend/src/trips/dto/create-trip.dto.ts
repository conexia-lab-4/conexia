import { IsDateString, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ArrivalAfterDeparture } from './arrival-after-departure.validator';
import { RouteDirection } from '../../../generated/prisma/client';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsString()
  @IsNotEmpty()
  campusId!: string;

  @IsEnum(RouteDirection)
  routeDirection!: RouteDirection;

  @IsDateString()
  departureTime!: string;

  @IsDateString()
  @ArrivalAfterDeparture()
  arrivalTime!: string;
}
