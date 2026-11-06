import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
