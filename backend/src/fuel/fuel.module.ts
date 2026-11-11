import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { FuelEstimatesController } from './fuel-estimates.controller';
import { FuelEstimateService } from './fuel-estimate.service';
import { FuelPriceService } from './fuel-price.service';

@Module({
  imports: [PrismaModule, GeoModule],
  controllers: [FuelEstimatesController],
  providers: [FuelEstimateService, FuelPriceService],
})
export class FuelModule {}
