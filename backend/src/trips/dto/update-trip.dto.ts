import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ArrivalAfterDeparture } from './arrival-after-departure.validator';

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
}
