import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MatchingModule } from '../matching/matching.module';
import { ChatModule } from '../chat/chat.module';
import { TravelMatchesService } from './travel-matches.service';
import { TravelMatchesController } from './travel-matches.controller';

@Module({
  imports: [PrismaModule, MatchingModule, ChatModule],
  controllers: [TravelMatchesController],
  providers: [TravelMatchesService],
})
export class TravelMatchesModule {}
