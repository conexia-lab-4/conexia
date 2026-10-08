import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { TravelIntentsService } from './travel-intents.service';
import { TravelIntentsController } from './travel-intents.controller';

@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [TravelIntentsController],
  providers: [TravelIntentsService],
  // Lo usa el matching para buscar las intenciones activas
  exports: [TravelIntentsService],
})
export class TravelIntentsModule {}
