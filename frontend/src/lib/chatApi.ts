import {
  collection,
  doc,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { authFetch } from './api';
import { db } from './firebase';
import { getErrorMessage } from './tripsApi';

const CONVERSATIONS = 'conversations';
const MESSAGES = 'messages';
const MESSAGES_LIMIT = 200;

// El mismo límite que validan las reglas de Firestore
export const MAX_MESSAGE_LENGTH = 1000;

export type ChatRole = 'DRIVER' | 'PASSENGER';

export interface ChatPerson {
  id: string;
  displayName: string | null;
  photoUrl: string | null;
  role: ChatRole;
}

export interface Conversation {
  tripId: string;
  destination: string;
  departureTime: Date;
  people: ChatPerson[];
  lastMessage: { text: string; authorId: string } | null;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  text: string;
  authorId: string;
  sentAt: Date;
}

type StoredPerson = Omit<ChatPerson, 'id'>;

// Una escritura pendiente todavía no tiene la hora del servidor
const SERVER_TIME = { serverTimestamps: 'estimate' } as const;

function toDate(value: unknown): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}

// Crea o recupera la conversación del viaje. El backend valida que el usuario
// participe y deja actualizados sus participantes
export async function openConversation(tripId: string): Promise<void> {
  const response = await authFetch(
    `/trips/${encodeURIComponent(tripId)}/conversation`,
    { method: 'POST' },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, 'No pudimos abrir el chat del viaje'),
    );
  }
}

export function subscribeToConversations(
  userId: string,
  onData: (conversations: Conversation[]) => void,
  onError: (error: Error) => void,
) {
  const conversations = query(
    collection(db, CONVERSATIONS),
    where('participantIds', 'array-contains', userId),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    conversations,
    (snapshot) => {
      onData(
        snapshot.docs.map((conversation) => {
          const data = conversation.data(SERVER_TIME);
          const participants: Record<string, StoredPerson> = data.participants;

          return {
            tripId: conversation.id,
            destination: data.destination,
            departureTime: toDate(data.departureTime),
            people: Object.entries(participants).map(([id, person]) => ({
              ...person,
              id,
            })),
            lastMessage: data.lastMessage,
            updatedAt: toDate(data.updatedAt),
          };
        }),
      );
    },
    onError,
  );
}

export function subscribeToMessages(
  tripId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
) {
  const messages = query(
    collection(db, CONVERSATIONS, tripId, MESSAGES),
    orderBy('sentAt'),
    limitToLast(MESSAGES_LIMIT),
  );

  return onSnapshot(
    messages,
    (snapshot) => {
      onData(
        snapshot.docs.map((message) => {
          const data = message.data(SERVER_TIME);

          return {
            id: message.id,
            text: data.text,
            authorId: data.authorId,
            sentAt: toDate(data.sentAt),
          };
        }),
      );
    },
    onError,
  );
}

// El mensaje y el resumen de la conversación se guardan juntos, para que el
// listado nunca muestre un último mensaje que no existe
export async function sendMessage(
  tripId: string,
  authorId: string,
  text: string,
): Promise<void> {
  const conversation = doc(db, CONVERSATIONS, tripId);
  const message = doc(collection(conversation, MESSAGES));
  const batch = writeBatch(db);

  batch.set(message, { text, authorId, sentAt: serverTimestamp() });
  batch.update(conversation, {
    lastMessage: { text, authorId },
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
}
