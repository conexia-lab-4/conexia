import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ArrivalAfterDeparture } from '../../trips/dto/arrival-after-departure.validator';

export class CreateTravelIntentDto {
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
