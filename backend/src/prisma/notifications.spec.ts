import { NotFoundException } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from './prisma.service';
import type * as admin from 'firebase-admin';

describe('Notifications persistence', () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const sendMock = jest.fn();
  const service = new NotificationsService(
    prisma as unknown as PrismaService,
    { messaging: () => ({ send: sendMock }) } as unknown as typeof admin,
  );
  const userA = 'test-user-notifications-a';
  const userB = 'test-user-notifications-b';
  const testUsers = [userA, userB];

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue('message-id');
  });

  beforeAll(async () => {
    for (const id of testUsers) {
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id, email: `${id}@example.com` },
      });
    }
  });

  afterEach(async () => {
    await prisma.notification.deleteMany({
      where: { userId: { in: testUsers } },
    });
    await prisma.user.updateMany({
      where: { id: { in: testUsers } },
      data: { fcmToken: null, fcmTokenUpdatedAt: null },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: testUsers } } });
    await prisma.$disconnect();
  });

  it('registra una notificación no leída y la conserva sin token FCM', async () => {
    const created = await service.create({
      userId: userA,
      title: 'Nuevo pasajero',
      message: 'Se sumó alguien a tu viaje',
      type: 'TRIP',
      referenceId: 'trip-1',
    });

    expect(created.id).toBeDefined();
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.readAt).toBeNull();

    const user = await prisma.user.findUnique({ where: { id: userA } });
    expect(user?.fcmToken).toBeNull();
    expect(await service.findMine(userA)).toHaveLength(1);
  });

  it('registra una sola notificación por evento y destinatario aunque se repita', async () => {
    const event = {
      recipientIds: [userA, userB],
      title: 'Nuevo pasajero',
      message: 'Se sumó alguien',
      type: 'TRIP' as const,
      referenceId: 'trip-1',
      eventKey: 'join:participacion-1',
    };

    await service.notify(event);
    await service.notify(event);

    expect(await service.findMine(userA)).toHaveLength(1);
    expect(await service.findMine(userB)).toHaveLength(1);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('manda el push solo a quien tiene token y no lo repite si el evento se repite', async () => {
    await prisma.user.update({
      where: { id: userA },
      data: { fcmToken: 'token-de-prueba-a' },
    });
    const event = {
      recipientIds: [userA, userB],
      title: 'Nuevo pasajero',
      message: 'Se sumó alguien',
      type: 'TRIP' as const,
      referenceId: 'trip-1',
      eventKey: 'join:participacion-2',
    };

    await service.notify(event);
    await service.notify(event);

    const stored = (await service.findMine(userA))[0];
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith({
      token: 'token-de-prueba-a',
      data: {
        notificationId: stored.id,
        type: 'TRIP',
        referenceId: 'trip-1',
        title: 'Nuevo pasajero',
        body: 'Se sumó alguien',
      },
    });
    expect(await service.findMine(userB)).toHaveLength(1);
  });

  it('lista solo las propias, de la más reciente a la más antigua', async () => {
    const base = { type: 'TRIP' as const, message: 'm' };
    await prisma.notification.createMany({
      data: [
        {
          ...base,
          userId: userA,
          title: 'vieja',
          createdAt: new Date('2026-11-01T10:00:00Z'),
        },
        {
          ...base,
          userId: userA,
          title: 'nueva',
          createdAt: new Date('2026-11-03T10:00:00Z'),
        },
        {
          ...base,
          userId: userA,
          title: 'media',
          createdAt: new Date('2026-11-02T10:00:00Z'),
        },
        {
          ...base,
          userId: userB,
          title: 'de otro usuario',
          createdAt: new Date('2026-11-04T10:00:00Z'),
        },
      ],
    });

    const titles = (await service.findMine(userA)).map((n) => n.title);

    expect(titles).toEqual(['nueva', 'media', 'vieja']);
  });

  it('actualiza el token con otro valor y repetir el mismo no genera duplicados', async () => {
    await service.registerToken(userA, 'test-token-1');
    await service.registerToken(userA, 'test-token-1');
    await service.registerToken(userA, 'test-token-2');

    const withTokens = await prisma.user.findMany({
      where: { fcmToken: { in: ['test-token-1', 'test-token-2'] } },
    });

    expect(withTokens).toHaveLength(1);
    expect(withTokens[0].id).toBe(userA);
    expect(withTokens[0].fcmToken).toBe('test-token-2');
  });

  it('un token ya registrado pasa al nuevo usuario y se lo quita al anterior', async () => {
    await service.registerToken(userA, 'test-token-shared');
    await service.registerToken(userB, 'test-token-shared');

    const a = await prisma.user.findUnique({ where: { id: userA } });
    const b = await prisma.user.findUnique({ where: { id: userB } });

    expect(a?.fcmToken).toBeNull();
    expect(b?.fcmToken).toBe('test-token-shared');
  });

  it('marcar como leída baja el contador y repetirlo no lo altera', async () => {
    const first = await service.create({
      userId: userA,
      title: 'uno',
      message: 'm',
      type: 'TRIP',
    });
    await service.create({
      userId: userA,
      title: 'dos',
      message: 'm',
      type: 'CHAT',
    });
    expect(await service.countUnread(userA)).toEqual({ count: 2 });

    const read = await service.markAsRead(userA, first.id);
    expect(read.readAt).toBeInstanceOf(Date);
    expect(await service.countUnread(userA)).toEqual({ count: 1 });

    const again = await service.markAsRead(userA, first.id);
    expect(again.readAt?.getTime()).toBe(read.readAt?.getTime());
    expect(await service.countUnread(userA)).toEqual({ count: 1 });
  });

  it('el contador es cero cuando no hay notificaciones pendientes', async () => {
    expect(await service.countUnread(userA)).toEqual({ count: 0 });
  });

  it('no deja marcar como leída la notificación de otro usuario', async () => {
    const ajena = await service.create({
      userId: userB,
      title: 'de B',
      message: 'm',
      type: 'TRIP',
    });

    await expect(service.markAsRead(userA, ajena.id)).rejects.toThrow(
      NotFoundException,
    );
    expect(await service.countUnread(userB)).toEqual({ count: 1 });
  });
});
