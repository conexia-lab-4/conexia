import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { TripsModule } from '../trips/trips.module';
import { TravelIntentsModule } from '../travel-intents/travel-intents.module';
import { RoundTripsController } from './round-trips.controller';
import { RoundTripsService } from './round-trips.service';

@Module({
  imports: [TripsModule, TravelIntentsModule, MatchingModule],
  controllers: [RoundTripsController],
  providers: [RoundTripsService],
})
export class RoundTripsModule {}
