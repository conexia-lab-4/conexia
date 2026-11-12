import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatController } from './chat.controller';
import { ChatNotificationsService } from './chat-notifications.service';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ChatController],
  providers: [ChatService, ChatNotificationsService],
  exports: [ChatService],
})
export class ChatModule {}
