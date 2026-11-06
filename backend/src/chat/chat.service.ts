import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { DisplayNamesService } from '../firebase/display-names.service';

const CONVERSATIONS = 'conversations';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly displayNames: DisplayNamesService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  // Crea o recupera la única conversación del viaje (id = tripId). Solo la
  // pueden abrir el conductor y los pasajeros
  async openConversation(tripId: string, userId: string) {
    const data = await this.buildConversationData(tripId);

    if (!data.participantIds.includes(userId)) {
      throw new ForbiddenException('No participás de este viaje');
    }

    const ref = this.conversationRef(tripId);
    await this.firebaseAdmin.firestore().runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (snapshot.exists) {
        // Ya existe: solo se actualizan viaje y participantes, sin tocar mensajes
        tx.update(ref, data);
      } else {
        tx.set(ref, {
          ...data,
          lastMessage: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    return { conversationId: tripId };
  }

  // Después de que alguien entra o sale del viaje. Si todavía no hay
  // conversación no crea ninguna, y si Firestore falla no rompe la operación
  async syncParticipants(tripId: string) {
    try {
      const ref = this.conversationRef(tripId);
      const snapshot = await ref.get();
      if (!snapshot.exists) return;
      await ref.update(await this.buildConversationData(tripId));
    } catch (error) {
      this.logger.warn(
        `No se pudieron sincronizar los participantes del viaje ${tripId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private conversationRef(tripId: string) {
    return this.firebaseAdmin.firestore().collection(CONVERSATIONS).doc(tripId);
  }

  private async buildConversationData(tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        origin: true,
        destination: true,
        departureTime: true,
        driverId: true,
        passengers: { select: { userId: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    const participantIds = [
      trip.driverId,
      ...trip.passengers.map((passenger) => passenger.userId),
    ];
    const users = await this.displayNames.getPublicUsers(participantIds);

    return {
      tripId,
      origin: trip.origin,
      destination: trip.destination,
      departureTime: admin.firestore.Timestamp.fromDate(trip.departureTime),
      participantIds,
      participants: Object.fromEntries(
        participantIds.map((id) => [
          id,
          {
            displayName: users.get(id)?.displayName ?? null,
            photoUrl: users.get(id)?.photoUrl ?? null,
            role: id === trip.driverId ? 'DRIVER' : 'PASSENGER',
          },
        ]),
      ),
    };
  }
}
