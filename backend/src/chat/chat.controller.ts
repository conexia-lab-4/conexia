import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ChatNotificationsService } from './chat-notifications.service';

@Controller('chat')
@UseGuards(FirebaseAuthGuard)
export class ChatController {
  constructor(private readonly chatNotifications: ChatNotificationsService) {}

  // El cliente avisa que envió un mensaje. Repetir la llamada no duplica el aviso
  @Post(':tripId/messages/:messageId/notify')
  @HttpCode(HttpStatus.NO_CONTENT)
  notifyMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tripId') tripId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatNotifications.notifyMessage(tripId, messageId, user.id);
  }
}
