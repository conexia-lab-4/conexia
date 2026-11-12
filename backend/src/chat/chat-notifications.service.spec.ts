import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { NotificationEventsService } from '../notifications/notification-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChatNotificationsService } from './chat-notifications.service';

describe('ChatNotificationsService', () => {
  let service: ChatNotificationsService;
  let prismaMock: { trip: { findUnique: jest.Mock } };
  let eventsMock: { chatMessage: jest.Mock };
  let getMessage: jest.Mock;

  const tripId = 'trip-1';
  const messageId = 'msg-1';

  beforeEach(() => {
    prismaMock = {
      trip: {
        findUnique: jest.fn().mockResolvedValue({
          driverId: 'driver-1',
          passengers: [{ userId: 'pasajero-1' }, { userId: 'pasajero-2' }],
        }),
      },
    };
    eventsMock = { chatMessage: jest.fn().mockResolvedValue(undefined) };
    getMessage = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({ authorId: 'pasajero-1', text: 'Hola a todos' }),
    });
    const firebaseMock = {
      firestore: () => ({
        collection: () => ({
          doc: () => ({
            collection: () => ({ doc: () => ({ get: getMessage }) }),
          }),
        }),
      }),
    };

    service = new ChatNotificationsService(
      prismaMock as unknown as PrismaService,
      firebaseMock as unknown as typeof admin,
      eventsMock as unknown as NotificationEventsService,
    );
  });

  it('avisa a los demás participantes y no al autor', async () => {
    await service.notifyMessage(tripId, messageId, 'pasajero-1');

    expect(eventsMock.chatMessage).toHaveBeenCalledWith({
      tripId,
      messageId,
      authorId: 'pasajero-1',
      text: 'Hola a todos',
      recipientIds: ['driver-1', 'pasajero-2'],
    });
  });

  it('el conductor también puede avisar su mensaje', async () => {
    getMessage.mockResolvedValue({
      exists: true,
      data: () => ({ authorId: 'driver-1', text: 'Salgo en 5' }),
    });

    await service.notifyMessage(tripId, messageId, 'driver-1');

    expect(eventsMock.chatMessage).toHaveBeenCalledWith({
      tripId,
      messageId,
      authorId: 'driver-1',
      text: 'Salgo en 5',
      recipientIds: ['pasajero-1', 'pasajero-2'],
    });
  });

  it('responde 404 si el viaje no existe', async () => {
    prismaMock.trip.findUnique.mockResolvedValue(null);

    await expect(
      service.notifyMessage(tripId, messageId, 'pasajero-1'),
    ).rejects.toThrow(NotFoundException);
    expect(eventsMock.chatMessage).not.toHaveBeenCalled();
  });

  it('rechaza a quien no participa del viaje', async () => {
    await expect(
      service.notifyMessage(tripId, messageId, 'ajeno-1'),
    ).rejects.toThrow(ForbiddenException);
    expect(eventsMock.chatMessage).not.toHaveBeenCalled();
  });

  it('responde 404 si el mensaje no existe en el chat', async () => {
    getMessage.mockResolvedValue({ exists: false });

    await expect(
      service.notifyMessage(tripId, messageId, 'pasajero-1'),
    ).rejects.toThrow(NotFoundException);
    expect(eventsMock.chatMessage).not.toHaveBeenCalled();
  });

  it('rechaza avisar el mensaje de otra persona', async () => {
    await expect(
      service.notifyMessage(tripId, messageId, 'pasajero-2'),
    ).rejects.toThrow(ForbiddenException);
    expect(eventsMock.chatMessage).not.toHaveBeenCalled();
  });

  it('rechaza un id de mensaje con caracteres raros sin consultar nada', async () => {
    await expect(
      service.notifyMessage(tripId, 'a/b/c', 'pasajero-1'),
    ).rejects.toThrow(NotFoundException);
    expect(prismaMock.trip.findUnique).not.toHaveBeenCalled();
  });
});
