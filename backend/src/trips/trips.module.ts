import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GeoModule } from '../geo/geo.module';
import { MatchingModule } from '../matching/matching.module';
import { ChatModule } from '../chat/chat.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    GeoModule,
    MatchingModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  // Lo usan los paquetes de ida y vuelta para crear sus tramos
  exports: [TripsService],
})
export class TripsModule {}
