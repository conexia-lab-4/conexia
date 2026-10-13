import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { MatchingService } from './matching.service';

@Module({
  imports: [PrismaModule, GeoModule],
  providers: [MatchingService],
  exports: [MatchingService],
})
export class MatchingModule {}
