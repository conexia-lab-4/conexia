import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { NotificationEventsService } from '../notifications/notification-events.service';
import { PrismaService } from '../prisma/prisma.service';

// Los ids de mensaje de Firestore son alfanuméricos: se rechaza cualquier otra
// cosa para no armar rutas raras
const MESSAGE_ID_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

@Injectable()
export class ChatNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
    private readonly notificationEvents: NotificationEventsService,
  ) {}

  // El mensaje se escribe directo en Firestore desde el cliente y después
  // avisa acá. Solo se notifica un mensaje que existe y que avisa su autor
  async notifyMessage(
    tripId: string,
    messageId: string,
    userId: string,
  ): Promise<void> {
    if (!MESSAGE_ID_REGEX.test(messageId)) {
      throw new NotFoundException('El mensaje no existe');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, passengers: { select: { userId: true } } },
    });
    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    const participantIds = [
      trip.driverId,
      ...trip.passengers.map((passenger) => passenger.userId),
    ];
    if (!participantIds.includes(userId)) {
      throw new ForbiddenException('No participás de este viaje');
    }

    const snapshot = await this.firebaseAdmin
      .firestore()
      .collection('conversations')
      .doc(tripId)
      .collection('messages')
      .doc(messageId)
      .get();
    if (!snapshot.exists) {
      throw new NotFoundException('El mensaje no existe');
    }

    const message = snapshot.data() as
      { authorId?: unknown; text?: unknown } | undefined;
    if (!message || message.authorId !== userId) {
      throw new ForbiddenException('Solo el autor puede avisar su mensaje');
    }

    await this.notificationEvents.chatMessage({
      tripId,
      messageId,
      authorId: userId,
      text: typeof message.text === 'string' ? message.text : '',
      recipientIds: participantIds.filter((id) => id !== userId),
    });
  }
}
