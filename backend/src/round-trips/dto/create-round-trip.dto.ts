import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { CreateTripDto } from '../../trips/dto/create-trip.dto';
import { ArrivalAfterDeparture } from '../../trips/dto/arrival-after-departure.validator';

export enum RoundTripKind {
  // Dos viajes con auto
  TRIP = 'TRIP',
  // Dos intenciones de viaje, para quien busca quién lo lleve
  INTENT = 'INTENT',
}

// La vuelta usa la misma sede y casa que la ida: solo trae sus horarios
export class ReturnLegDto {
  @IsDateString()
  departureTime!: string;

  @IsDateString()
  @ArrivalAfterDeparture()
  arrivalTime!: string;
}

// La ida tiene los mismos campos que un viaje o una intención simple
export class CreateRoundTripDto extends CreateTripDto {
  @IsEnum(RoundTripKind)
  kind!: RoundTripKind;

  @IsDefined()
  @ValidateNested()
  @Type(() => ReturnLegDto)
  return!: ReturnLegDto;
}
