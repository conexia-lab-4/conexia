import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  Prisma,
  type Notification,
  NotificationType,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
}

export interface NotifyInput {
  recipientIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  // Viaje (TRIP y CHAT) o match (MATCH) al que apunta el aviso
  referenceId: string;
  // Identifica el evento. Junto con cada destinatario evita registrarlo dos veces
  eventKey: string;
}

const INVALID_TOKEN_CODES = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
];

function isInvalidTokenError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    INVALID_TOKEN_CODES.includes(error.code)
  );
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // Un token pertenece a un solo usuario: si otro lo tenía registrado (mismo
  // dispositivo con otra sesión) se le quita, para no mandarle push ajenos
  async registerToken(userId: string, token: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { fcmToken: token, id: { not: userId } },
        data: { fcmToken: null, fcmTokenUpdatedAt: null },
      });
      await tx.user.update({
        where: { id: userId },
        data: { fcmToken: token, fcmTokenUpdatedAt: new Date() },
      });
    });
  }

  // Alta suelta (solo la usan las utilidades de prueba). Se guarda siempre,
  // tenga o no token FCM el destinatario
  create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        referenceId: input.referenceId,
      },
    });
  }

  // Avisa un evento a sus destinatarios. Se llama después de confirmar la
  // operación y nunca lanza: un fallo acá no debe romper el viaje ni el chat.
  // Una notificación por evento y destinatario: repetir el evento no duplica
  // el registro ni vuelve a mandar el push
  async notify(input: NotifyInput): Promise<void> {
    const recipientIds = [...new Set(input.recipientIds)];

    for (const userId of recipientIds) {
      let notification: Notification;
      try {
        notification = await this.prisma.notification.create({
          data: {
            userId,
            title: input.title,
            message: input.message,
            type: input.type,
            referenceId: input.referenceId,
            eventKey: input.eventKey,
          },
        });
      } catch (error) {
        // Ya se avisó este evento a este usuario
        if (isUniqueViolation(error)) continue;
        this.logger.error(
          `No se pudo guardar la notificación ${input.eventKey} para ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      await this.sendPush(notification);
    }
  }

  // El registro ya está guardado: si el envío falla, igual aparece in-app.
  // Sin token no se envía nada. Solo manda datos (sin "notification") para que
  // la app decida si mostrarlo: en primer plano solo in-app, fuera de la app
  // el service worker muestra el aviso del sistema
  private async sendPush(notification: Notification): Promise<void> {
    let token: string | null = null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { fcmToken: true },
      });
      token = user?.fcmToken ?? null;
      if (!token) return;

      await this.firebaseAdmin.messaging().send({
        token,
        data: {
          notificationId: notification.id,
          type: notification.type,
          referenceId: notification.referenceId ?? '',
          title: notification.title,
          body: notification.message,
        },
      });
    } catch (error) {
      if (token && isInvalidTokenError(error)) {
        // El dispositivo ya no existe: se limpia para no insistir
        await this.prisma.user
          .updateMany({
            where: { id: notification.userId, fcmToken: token },
            data: { fcmToken: null, fcmTokenUpdatedAt: null },
          })
          .catch(() => undefined);
      }
      this.logger.warn(
        `No se pudo enviar el push de ${notification.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  // Idempotente: solo marca las que siguen sin leer, así repetir la llamada
  // no cambia readAt ni el contador. Una ajena responde igual que una que no existe
  async markAsRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notification) {
      throw new NotFoundException('La notificación no existe');
    }

    return notification;
  }
}
