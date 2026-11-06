import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { MatchingModule } from '../matching/matching.module';
import { ChatModule } from '../chat/chat.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [PrismaModule, GeoModule, MatchingModule, ChatModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
