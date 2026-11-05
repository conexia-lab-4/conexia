import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { MatchingModule } from '../matching/matching.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [PrismaModule, GeoModule, MatchingModule],
  controllers: [TripsController],
  providers: [TripsService],
  // Lo usan los paquetes de ida y vuelta para crear sus tramos
  exports: [TripsService],
})
export class TripsModule {}
