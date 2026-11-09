import { Logger } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/client';
import { DisplayNamesService } from '../firebase/display-names.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';
import { NotificationsService } from './notifications.service';

describe('NotificationEventsService', () => {
  let service: NotificationEventsService;
  let prismaMock: { trip: { findUnique: jest.Mock } };
  let notificationsMock: { notify: jest.Mock };
  let displayNamesMock: { getPublicUsers: jest.Mock };

  const tripId = 'trip-1';
  const trip = {
    driverId: 'driver-1',
    origin: 'Pilar',
    destination: 'Palermo',
    passengers: [{ userId: 'pasajero-1' }, { userId: 'pasajero-2' }],
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prismaMock = { trip: { findUnique: jest.fn().mockResolvedValue(trip) } };
    notificationsMock = { notify: jest.fn().mockResolvedValue(undefined) };
    displayNamesMock = {
      getPublicUsers: jest.fn().mockResolvedValue(
        new Map([
          ['pasajero-2', { displayName: 'Lucía', photoUrl: null }],
          ['driver-1', { displayName: 'Ana', photoUrl: null }],
        ]),
      ),
    };

    service = new NotificationEventsService(
      prismaMock as unknown as PrismaService,
      notificationsMock as unknown as NotificationsService,
      displayNamesMock as unknown as DisplayNamesService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('tripJoined', () => {
    it('avisa al conductor y a los demás pasajeros, no a quien se sumó', async () => {
      await service.tripJoined(tripId, 'pasajero-2', 'participacion-1');

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo pasajero',
        message: 'Lucía se sumó al viaje de Pilar a Palermo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: 'join:participacion-1',
      });
    });

    it('un nuevo ingreso del mismo pasajero tiene otra clave de evento', async () => {
      await service.tripJoined(tripId, 'pasajero-2', 'participacion-2');

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo pasajero',
        message: 'Lucía se sumó al viaje de Pilar a Palermo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: 'join:participacion-2',
      });
    });

    it('no avisa si el viaje ya no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await service.tripJoined(tripId, 'pasajero-2', 'participacion-1');

      expect(notificationsMock.notify).not.toHaveBeenCalled();
    });

    it('avisa con un nombre genérico si no se pueden obtener los nombres', async () => {
      displayNamesMock.getPublicUsers.mockRejectedValue(new Error('caído'));

      await service.tripJoined(tripId, 'pasajero-2', 'participacion-1');

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo pasajero',
        message: 'Un pasajero se sumó al viaje de Pilar a Palermo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: 'join:participacion-1',
      });
    });

    it('no lanza si falla la consulta del viaje', async () => {
      prismaMock.trip.findUnique.mockRejectedValue(new Error('DB caída'));

      await expect(
        service.tripJoined(tripId, 'pasajero-2', 'participacion-1'),
      ).resolves.toBeUndefined();
      expect(notificationsMock.notify).not.toHaveBeenCalled();
    });
  });

  describe('tripLeft', () => {
    it('avisa al conductor y a los pasajeros que siguen, no a quien salió', async () => {
      prismaMock.trip.findUnique.mockResolvedValue({
        ...trip,
        passengers: [{ userId: 'pasajero-1' }],
      });
      const leftAt = new Date('2026-11-09T12:00:00.000Z');

      await service.tripLeft(tripId, 'pasajero-2', leftAt);

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Un pasajero se bajó',
        message: 'Lucía dejó el viaje de Pilar a Palermo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: `leave:${tripId}:pasajero-2:${leftAt.getTime()}`,
      });
    });
  });

  describe('tripCancelled', () => {
    it('avisa a todos los pasajeros y no al conductor, sin consultar el viaje', async () => {
      await service.tripCancelled({
        tripId,
        origin: 'Pilar',
        destination: 'Palermo',
        passengerIds: ['pasajero-1', 'pasajero-2'],
      });

      expect(prismaMock.trip.findUnique).not.toHaveBeenCalled();
      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['pasajero-1', 'pasajero-2'],
        title: 'Viaje cancelado',
        message: 'El conductor canceló el viaje de Pilar a Palermo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: `cancel:${tripId}`,
      });
    });
  });

  describe('matchesCreated', () => {
    const match = {
      matchId: 'match-1',
      tripId,
      driverId: 'driver-1',
      passengerId: 'pasajero-1',
    };

    it('avisa solo al pasajero y al conductor de ese match', async () => {
      await service.matchesCreated([match]);

      expect(notificationsMock.notify).toHaveBeenCalledTimes(2);
      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['pasajero-1'],
        title: 'Encontramos un viaje para vos',
        message: 'Hay un viaje que coincide con tu búsqueda. Entrá a verlo',
        type: NotificationType.MATCH,
        referenceId: 'match-1',
        eventKey: 'match:match-1',
      });
      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1'],
        title: 'Nuevo pasajero para tu viaje',
        message: 'Hay un pasajero que coincide con tu viaje. Entrá a verlo',
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: 'match:match-1',
      });
    });

    it('avisa cada match por separado', async () => {
      await service.matchesCreated([
        match,
        { ...match, matchId: 'match-2', passengerId: 'pasajero-2' },
      ]);

      expect(notificationsMock.notify).toHaveBeenCalledTimes(4);
    });
  });

  describe('chatMessage', () => {
    const event = {
      tripId,
      messageId: 'msg-1',
      authorId: 'pasajero-2',
      text: 'Hola a todos',
      recipientIds: ['driver-1', 'pasajero-1'],
    };

    it('avisa a los destinatarios con el viaje como referencia del chat', async () => {
      await service.chatMessage(event);

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo mensaje de Lucía',
        message: 'Hola a todos',
        type: NotificationType.CHAT,
        referenceId: tripId,
        eventKey: `chat:${tripId}:msg-1`,
      });
    });

    it('acorta los mensajes largos', async () => {
      await service.chatMessage({ ...event, text: 'a'.repeat(150) });

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo mensaje de Lucía',
        message: `${'a'.repeat(97)}...`,
        type: NotificationType.CHAT,
        referenceId: tripId,
        eventKey: `chat:${tripId}:msg-1`,
      });
    });

    it('usa un nombre genérico si no se puede obtener el del autor', async () => {
      displayNamesMock.getPublicUsers.mockRejectedValue(new Error('caído'));

      await service.chatMessage(event);

      expect(notificationsMock.notify).toHaveBeenCalledWith({
        recipientIds: ['driver-1', 'pasajero-1'],
        title: 'Nuevo mensaje de Alguien',
        message: 'Hola a todos',
        type: NotificationType.CHAT,
        referenceId: tripId,
        eventKey: `chat:${tripId}:msg-1`,
      });
    });
  });
});
