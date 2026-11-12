import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma/client';
import { DisplayNamesService } from '../firebase/display-names.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

// Datos de un viaje que ya se eliminó: se guardan antes de borrarlo
export interface CancelledTrip {
  tripId: string;
  origin: string;
  destination: string;
  passengerIds: string[];
}

// Un match recién creado, con quiénes lo protagonizan
export interface NewMatch {
  matchId: string;
  tripId: string;
  driverId: string;
  passengerId: string;
}

// Un mensaje de chat ya guardado, con quiénes deben enterarse
export interface ChatMessageEvent {
  tripId: string;
  messageId: string;
  authorId: string;
  text: string;
  recipientIds: string[];
}

const PREVIEW_LENGTH = 100;

// Arma el texto, los destinatarios y la referencia de cada evento. Ninguno
// lanza: un aviso que falla nunca debe romper la operación que lo originó
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly displayNames: DisplayNamesService,
  ) {}

  // Un pasajero se sumó: avisa al conductor y a los demás pasajeros
  tripJoined(tripId: string, joinerId: string, participationId: string) {
    return this.run('ingreso', async () => {
      const trip = await this.loadTrip(tripId);
      if (!trip) return;

      const name = await this.nameOf(joinerId);
      await this.notifications.notify({
        recipientIds: this.othersOf(trip, joinerId),
        title: 'Nuevo pasajero',
        message: `${name} se sumó al viaje de ${trip.origin} a ${trip.destination}`,
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: `join:${participationId}`,
      });
    });
  }

  // Un pasajero salió: avisa al conductor y a los que siguen en el viaje
  tripLeft(tripId: string, leaverId: string, leftAt: Date) {
    return this.run('salida', async () => {
      const trip = await this.loadTrip(tripId);
      if (!trip) return;

      const name = await this.nameOf(leaverId);
      await this.notifications.notify({
        recipientIds: this.othersOf(trip, leaverId),
        title: 'Un pasajero se bajó',
        message: `${name} dejó el viaje de ${trip.origin} a ${trip.destination}`,
        type: NotificationType.TRIP,
        referenceId: tripId,
        eventKey: `leave:${tripId}:${leaverId}:${leftAt.getTime()}`,
      });
    });
  }

  // El conductor canceló el viaje: avisa a los pasajeros que participaban.
  // El viaje ya no existe, por eso llega con los datos guardados de antes
  tripCancelled(trip: CancelledTrip) {
    return this.run('cancelación', async () => {
      await this.notifications.notify({
        recipientIds: trip.passengerIds,
        title: 'Viaje cancelado',
        message: `El conductor canceló el viaje de ${trip.origin} a ${trip.destination}`,
        type: NotificationType.TRIP,
        referenceId: trip.tripId,
        eventKey: `cancel:${trip.tripId}`,
      });
    });
  }

  // Hubo coincidencias nuevas: avisa solo al conductor y al pasajero de cada una.
  // El pasajero abre el match; el conductor no puede, así que abre su viaje
  matchesCreated(matches: NewMatch[]) {
    return this.run('nuevo match', async () => {
      for (const match of matches) {
        await this.notifications.notify({
          recipientIds: [match.passengerId],
          title: 'Encontramos un viaje para vos',
          message: 'Hay un viaje que coincide con tu búsqueda. Entrá a verlo',
          type: NotificationType.MATCH,
          referenceId: match.matchId,
          eventKey: `match:${match.matchId}`,
        });
        await this.notifications.notify({
          recipientIds: [match.driverId],
          title: 'Nuevo pasajero para tu viaje',
          message: 'Hay un pasajero que coincide con tu viaje. Entrá a verlo',
          type: NotificationType.TRIP,
          referenceId: match.tripId,
          eventKey: `match:${match.matchId}`,
        });
      }
    });
  }

  // Un mensaje nuevo: avisa a los demás participantes del chat, no al autor.
  // La referencia es el viaje, que es también el id de la conversación
  chatMessage(event: ChatMessageEvent) {
    return this.run('mensaje de chat', async () => {
      const name = await this.nameOf(event.authorId, 'Alguien');
      const text = event.text.trim();

      await this.notifications.notify({
        recipientIds: event.recipientIds,
        title: `Nuevo mensaje de ${name}`,
        message:
          text.length > PREVIEW_LENGTH
            ? `${text.slice(0, PREVIEW_LENGTH - 3)}...`
            : text,
        type: NotificationType.CHAT,
        referenceId: event.tripId,
        eventKey: `chat:${event.tripId}:${event.messageId}`,
      });
    });
  }

  private async run(event: string, action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      this.logger.error(
        `No se pudo generar el aviso de ${event}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private loadTrip(tripId: string) {
    return this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        driverId: true,
        origin: true,
        destination: true,
        passengers: { select: { userId: true } },
      },
    });
  }

  // Conductor y pasajeros del viaje, menos quien protagoniza el evento
  private othersOf(
    trip: { driverId: string; passengers: { userId: string }[] },
    excludedId: string,
  ): string[] {
    return [
      trip.driverId,
      ...trip.passengers.map((passenger) => passenger.userId),
    ].filter((id) => id !== excludedId);
  }

  // Si no se puede obtener el nombre, el aviso sale igual con uno genérico
  private async nameOf(
    userId: string,
    fallback = 'Un pasajero',
  ): Promise<string> {
    try {
      const users = await this.displayNames.getPublicUsers([userId]);
      return users.get(userId)?.displayName ?? fallback;
    } catch {
      return fallback;
    }
  }
}
