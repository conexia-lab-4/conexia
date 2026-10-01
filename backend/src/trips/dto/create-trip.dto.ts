import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ArrivalAfterDeparture } from './arrival-after-departure.validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsDateString()
  departureTime!: string;

  @IsDateString()
  @ArrivalAfterDeparture()
  arrivalTime!: string;
}
