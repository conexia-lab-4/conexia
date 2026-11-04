import { IsDateString, IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { ArrivalAfterDeparture } from '../../trips/dto/arrival-after-departure.validator';
import { RouteDirection } from '../../../generated/prisma/client';

export class CreateTravelIntentDto {
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
