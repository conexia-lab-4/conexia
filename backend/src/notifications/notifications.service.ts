import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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

  // Uso interno (semana 3: eventos reales). Se guarda siempre, tenga o no
  // token FCM el destinatario
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
