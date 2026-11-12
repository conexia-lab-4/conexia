import type * as admin from 'firebase-admin';
import { NotificationType, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService.notify', () => {
  let service: NotificationsService;
  let prismaMock: {
    notification: { create: jest.Mock };
    user: { findUnique: jest.Mock; updateMany: jest.Mock };
  };
  let sendMock: jest.Mock;

  const input = {
    recipientIds: ['user-a', 'user-b'],
    title: 'Título',
    message: 'Mensaje',
    type: NotificationType.TRIP,
    referenceId: 'trip-1',
    eventKey: 'join:trip-1:user-c',
  };

  const stored = (userId: string) => ({
    id: `notification-${userId}`,
    userId,
    title: input.title,
    message: input.message,
    type: input.type,
    referenceId: input.referenceId,
    eventKey: input.eventKey,
    readAt: null,
    createdAt: new Date(),
  });

  beforeEach(() => {
    sendMock = jest.fn().mockResolvedValue('message-id');
    prismaMock = {
      notification: {
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: { userId: string } }) =>
            Promise.resolve(stored(data.userId)),
          ),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ fcmToken: 'token-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const firebaseMock = {
      messaging: () => ({ send: sendMock }),
    };
    service = new NotificationsService(
      prismaMock as unknown as PrismaService,
      firebaseMock as unknown as typeof admin,
    );
  });

  it('guarda una notificación por destinatario y manda el push con la referencia', async () => {
    await service.notify(input);

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-a',
        title: 'Título',
        message: 'Mensaje',
        type: NotificationType.TRIP,
        referenceId: 'trip-1',
        eventKey: 'join:trip-1:user-c',
      },
    });
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledWith({
      token: 'token-1',
      data: {
        notificationId: 'notification-user-a',
        type: 'TRIP',
        referenceId: 'trip-1',
        title: 'Título',
        body: 'Mensaje',
      },
    });
  });

  it('no repite un destinatario que aparece dos veces', async () => {
    await service.notify({ ...input, recipientIds: ['user-a', 'user-a'] });

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
  });

  it('si el evento ya se avisó a ese usuario no duplica ni reenvía el push', async () => {
    prismaMock.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(service.notify(input)).resolves.toBeUndefined();

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('guarda la notificación aunque el usuario no tenga token', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ fcmToken: null });

    await service.notify(input);

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('si FCM falla no lanza y el registro queda guardado', async () => {
    sendMock.mockRejectedValue(new Error('FCM caído'));

    await expect(service.notify(input)).resolves.toBeUndefined();

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it('si el token ya no es válido lo limpia', async () => {
    sendMock.mockRejectedValue({
      code: 'messaging/registration-token-not-registered',
    });

    await service.notify({ ...input, recipientIds: ['user-a'] });

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'user-a', fcmToken: 'token-1' },
      data: { fcmToken: null, fcmTokenUpdatedAt: null },
    });
  });

  it('si no puede guardar un registro sigue con los demás destinatarios', async () => {
    prismaMock.notification.create
      .mockRejectedValueOnce(new Error('DB caída'))
      .mockImplementation(({ data }: { data: { userId: string } }) =>
        Promise.resolve(stored(data.userId)),
      );

    await expect(service.notify(input)).resolves.toBeUndefined();

    expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });
});
