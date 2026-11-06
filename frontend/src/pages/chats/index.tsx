import { useEffect, useState } from 'react';
import { useAuth } from '../../context/authContext';
import { NavBar } from '../../components/navbar';
import { ConversationCard } from '../../components/conversationcard';
import { EmptyTripsState } from '../../components/emptytripsstate';
import ConexiaLoader from '../../components/ConexiaLoader';
import { subscribeToConversations, type Conversation } from '../../lib/chatApi';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'error';

export function Chats() {
  const { user } = useAuth();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    return subscribeToConversations(
      userId,
      (data) => {
        setConversations(data);
        setStatus('ready');
      },
      (error) => {
        console.error('Error al cargar los chats:', error);
        setStatus('error');
      },
    );
  }, [userId, reloadKey]);

  const handleRetry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="chats">
      <header className="chats__header">
        <h1 className="text-h4-bold">Chats</h1>
        <p className="chats__subtitle text-body-2">
          Hablá con quienes comparten tus viajes.
        </p>
      </header>

      {status === 'loading' && (
        <div className="chats__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="chats__status chats__status--error">
          <p>No pudimos cargar tus chats. Intentá de nuevo más tarde.</p>
          <button
            type="button"
            className="chats__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'ready' && userId && (
        <>
          {conversations.length === 0 ? (
            <EmptyTripsState
              title="Todavía no tenés chats"
              subtitle="Abrí el chat desde el detalle de un viaje y va a aparecer acá."
            />
          ) : (
            <ul className="chats__list">
              {conversations.map((conversation) => (
                <li key={conversation.tripId}>
                  <ConversationCard
                    conversation={conversation}
                    userId={userId}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <NavBar activeItem="viajes" />
    </div>
  );
}
