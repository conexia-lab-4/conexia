import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: {
    user: { updateMany: jest.Mock; update: jest.Mock };
    notification: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const userId = 'user-123';

  beforeEach(() => {
    prismaMock = {
      user: { updateMany: jest.fn(), update: jest.fn() },
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    prismaMock.$transaction.mockImplementation(
      (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock),
    );
    service = new NotificationsService(
      prismaMock as unknown as PrismaService,
      {} as never,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registerToken', () => {
    it('guarda el token del usuario y se lo quita a cualquier otro que lo tuviera', async () => {
      const now = new Date('2026-11-05T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      await service.registerToken(userId, 'token-1');

      expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
        where: { fcmToken: 'token-1', id: { not: userId } },
        data: { fcmToken: null, fcmTokenUpdatedAt: null },
      });
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { fcmToken: 'token-1', fcmTokenUpdatedAt: now },
      });
    });
  });

  describe('create', () => {
    it('registra la notificación para el destinatario indicado', async () => {
      const created = { id: 'notification-1', readAt: null };
      prismaMock.notification.create.mockResolvedValue(created);

      const result = await service.create({
        userId,
        title: 'Nuevo pasajero',
        message: 'Se sumó alguien a tu viaje',
        type: 'TRIP',
        referenceId: 'trip-1',
      });

      expect(result).toBe(created);
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          userId,
          title: 'Nuevo pasajero',
          message: 'Se sumó alguien a tu viaje',
          type: 'TRIP',
          referenceId: 'trip-1',
        },
      });
    });
  });

  describe('findMine', () => {
    it('lista solo las del usuario, de la más reciente a la más antigua', async () => {
      const notifications = [{ id: 'notification-1' }];
      prismaMock.notification.findMany.mockResolvedValue(notifications);

      const result = await service.findMine(userId);

      expect(result).toBe(notifications);
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
    });
  });

  describe('countUnread', () => {
    it('cuenta las no leídas del usuario', async () => {
      prismaMock.notification.count.mockResolvedValue(3);

      const result = await service.countUnread(userId);

      expect(result).toEqual({ count: 3 });
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId, readAt: null },
      });
    });

    it('devuelve cero cuando no hay pendientes', async () => {
      prismaMock.notification.count.mockResolvedValue(0);

      expect(await service.countUnread(userId)).toEqual({ count: 0 });
    });
  });

  describe('markAsRead', () => {
    it('marca como leída una propia que seguía sin leer', async () => {
      const now = new Date('2026-11-05T10:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);
      const read = { id: 'notification-1', readAt: now };
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.notification.findFirst.mockResolvedValue(read);

      const result = await service.markAsRead(userId, 'notification-1');

      expect(result).toBe(read);
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notification-1', userId, readAt: null },
        data: { readAt: now },
      });
    });

    it('si ya estaba leída no cambia su fecha de lectura', async () => {
      const readAt = new Date('2026-11-01T10:00:00Z');
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.notification.findFirst.mockResolvedValue({
        id: 'notification-1',
        readAt,
      });

      const result = await service.markAsRead(userId, 'notification-1');

      expect(result.readAt).toBe(readAt);
    });

    it('lanza NotFoundException si no existe o es de otro usuario', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead(userId, 'ajena')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'ajena', userId },
      });
    });
  });
});
