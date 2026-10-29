import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { DisplayNamesService } from '../firebase/display-names.service';

describe('ChatService', () => {
  let service: ChatService;
  let prismaMock: { trip: { findUnique: jest.Mock } };
  let displayNamesMock: { getDisplayNames: jest.Mock };
  let ref: { get: jest.Mock; update: jest.Mock };
  let tx: { get: jest.Mock; set: jest.Mock; update: jest.Mock };
  let doc: jest.Mock;

  const tripId = 'trip-1';
  const departureTime = new Date('2026-11-02T08:00:00.000Z');
  const trip = {
    origin: 'Pilar',
    destination: 'Palermo',
    departureTime,
    driverId: 'driver-1',
    passengers: [{ userId: 'pasajero-1' }],
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    prismaMock = { trip: { findUnique: jest.fn().mockResolvedValue(trip) } };
    displayNamesMock = {
      getDisplayNames: jest.fn().mockResolvedValue(
        new Map([
          ['driver-1', 'Ana'],
          ['pasajero-1', null],
        ]),
      ),
    };
    ref = {
      get: jest.fn().mockResolvedValue({ exists: true }),
      update: jest.fn().mockResolvedValue(undefined),
    };
    tx = {
      get: jest.fn().mockResolvedValue({ exists: false }),
      set: jest.fn(),
      update: jest.fn(),
    };
    doc = jest.fn(() => ref);
    const firebaseAdminMock = {
      firestore: () => ({
        collection: () => ({ doc }),
        runTransaction: (callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
      }),
    };

    service = new ChatService(
      prismaMock as unknown as PrismaService,
      displayNamesMock as unknown as DisplayNamesService,
      firebaseAdminMock as unknown as typeof admin,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectedData = {
    tripId,
    origin: 'Pilar',
    destination: 'Palermo',
    departureTime: admin.firestore.Timestamp.fromDate(departureTime),
    participantIds: ['driver-1', 'pasajero-1'],
    participants: {
      'driver-1': { displayName: 'Ana', role: 'DRIVER' },
      'pasajero-1': { displayName: null, role: 'PASSENGER' },
    },
  };

  describe('openConversation', () => {
    it('crea una única conversación por viaje con sus participantes', async () => {
      const result = await service.openConversation(tripId, 'pasajero-1');

      expect(result).toEqual({ conversationId: tripId });
      expect(doc).toHaveBeenCalledWith(tripId);
      expect(tx.set).toHaveBeenCalledWith(
        ref,
        expect.objectContaining({ ...expectedData, lastMessage: null }),
      );
      expect(tx.update).not.toHaveBeenCalled();
    });

    it('recupera la conversación existente sin pisar sus mensajes', async () => {
      tx.get.mockResolvedValue({ exists: true });

      await service.openConversation(tripId, 'driver-1');

      expect(tx.set).not.toHaveBeenCalled();
      expect(tx.update).toHaveBeenCalledWith(ref, expectedData);
    });

    it('no deja abrir el chat a quien no participa del viaje', async () => {
      await expect(service.openConversation(tripId, 'ajeno')).rejects.toThrow(
        ForbiddenException,
      );
      expect(tx.set).not.toHaveBeenCalled();
    });

    it('responde 404 si el viaje no existe', async () => {
      prismaMock.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.openConversation(tripId, 'driver-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncParticipants', () => {
    it('actualiza los participantes de una conversación existente', async () => {
      await service.syncParticipants(tripId);

      expect(ref.update).toHaveBeenCalledWith(expectedData);
    });

    it('no crea conversaciones para viajes sin chat', async () => {
      ref.get.mockResolvedValue({ exists: false });

      await service.syncParticipants(tripId);

      expect(ref.update).not.toHaveBeenCalled();
      expect(prismaMock.trip.findUnique).not.toHaveBeenCalled();
    });

    it('no lanza si Firestore falla', async () => {
      ref.get.mockRejectedValue(new Error('sin conexión'));

      await expect(service.syncParticipants(tripId)).resolves.toBeUndefined();
    });
  });
});
