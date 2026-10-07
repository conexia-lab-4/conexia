import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { GeoModule } from '../geo/geo.module';

@Module({
  imports: [PrismaModule, GeoModule],
  // ...igual
})
@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
