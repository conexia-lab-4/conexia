import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { ArrivalAfterDeparture } from './arrival-after-departure.validator';
import { RouteDirection } from '../../../generated/prisma/client';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  origin?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  destination?: string;

  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @IsOptional()
  @IsDateString()
  @ArrivalAfterDeparture()
  arrivalTime?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  campusId?: string;

  @IsOptional()
  @IsEnum(RouteDirection)
  routeDirection?: RouteDirection;
}
