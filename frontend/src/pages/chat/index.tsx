import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../../context/authContext';
import { Avatar } from '../../components/avatar';
import { RouteTimeline } from '../../components/routetimeline';
import ConexiaLoader from '../../components/ConexiaLoader';
import { Button } from '../../components/button';
import { IconBack } from '../../assets/icons/IconBack';
import { IconCalendar } from '../../assets/icons/IconCalendar';
import { IconCar } from '../../assets/icons/IconCar';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconSend } from '../../assets/icons/IconSend';
import {
  MAX_MESSAGE_LENGTH,
  openConversation,
  sendMessage,
  subscribeToMessages,
  type ChatMessage,
  type ChatPerson,
} from '../../lib/chatApi';
import {
  formatChatDate,
  formatChatTime,
  formatDaySeparator,
  formatPassengerCount,
  getConversationHeading,
  isSameDay,
} from '../../lib/chatFormat';
import { getTrip, UnavailableError, type TripDetail } from '../../lib/tripsApi';
import { formatTime, getPersonName } from '../../lib/tripFormat';
import './index.css';

type LoadStatus = 'loading' | 'ready' | 'unavailable' | 'error';

// Si el usuario está leyendo más arriba, un mensaje nuevo no lo mueve
const NEAR_BOTTOM_PX = 80;

function getTripPeople(trip: TripDetail): ChatPerson[] {
  return [
    {
      id: trip.driver.id,
      displayName: trip.driver.displayName,
      photoUrl: trip.driver.photoUrl,
      role: 'DRIVER',
    },
    ...trip.passengers.map((passenger): ChatPerson => ({
      id: passenger.userId,
      displayName: passenger.user.displayName,
      photoUrl: passenger.user.photoUrl,
      role: 'PASSENGER',
    })),
  ];
}

function getHeadingSubtitle(trip: TripDetail, person: ChatPerson | null) {
  if (!person) return formatPassengerCount(trip.passengers.length);
  if (person.role === 'PASSENGER') return 'Pasajero';
  const carModel = trip.driver.studentProfile?.carModel;
  return carModel ? `Conductor · ${carModel}` : 'Conductor';
}

export function ChatPage() {
  const { tripId = '' } = useParams<{ tripId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    // Si se sale de la pantalla antes de terminar, no se abre la suscripción
    let ignore = false;
    let unsubscribe: (() => void) | undefined;

    const handleError = (error: Error) => {
      if (ignore) return;
      console.error('Error al cargar el chat:', error);
      if (error instanceof UnavailableError) {
        setStatus('unavailable');
        return;
      }
      // Los errores del backend vienen listos para mostrar; los de Firestore no
      setLoadError(error instanceof FirebaseError ? null : error.message);
      setStatus('error');
    };

    openConversation(tripId)
      .then(() => getTrip(tripId))
      .then((data) => {
        if (ignore) return;
        setTrip(data);
        unsubscribe = subscribeToMessages(
          tripId,
          (nextMessages) => {
            setMessages(nextMessages);
            setStatus('ready');
          },
          handleError,
        );
      })
      .catch(handleError);

    return () => {
      ignore = true;
      unsubscribe?.();
    };
  }, [userId, tripId, reloadKey]);

  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    if (scroll && isNearBottomRef.current) {
      scroll.scrollTop = scroll.scrollHeight;
    }
  }, [messages, status]);

  const people = useMemo(() => (trip ? getTripPeople(trip) : []), [trip]);

  const handleRetry = () => {
    setLoadError(null);
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  const handleScroll = () => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    isNearBottomRef.current =
      scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight <
      NEAR_BOTTOM_PX;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const message = text.trim();
    if (!message || !userId) return;

    setText('');
    setSendError(null);
    isNearBottomRef.current = true;

    try {
      await sendMessage(tripId, userId, message);
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      setSendError('No pudimos enviar el mensaje. Intentá de nuevo.');
      // Se devuelve el texto para no perderlo, salvo que ya esté escribiendo otro
      setText((current) => current || message);
    }
  };

  const heading =
    trip && userId
      ? getConversationHeading(people, userId, trip.destination)
      : null;
  const showAuthorNames = people.length > 2;

  return (
    <div className="chat">
      <header className="chat__header">
        <button
          type="button"
          className="chat__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          <IconBack size={24} color="var(--color-black)" />
        </button>

        {trip && heading ? (
          <>
            {heading.person ? (
              <Avatar
                className="chat__header-avatar"
                photoUrl={heading.person.photoUrl}
                name={heading.person.displayName}
              />
            ) : (
              <span className="chat__header-avatar">
                <IconCar size={22} color="var(--color-primary-500)" />
              </span>
            )}
            <div className="chat__heading">
              <h1 className="chat__title">{heading.title}</h1>
              <p className="chat__subtitle">
                {getHeadingSubtitle(trip, heading.person)}
              </p>
            </div>
          </>
        ) : (
          <h1 className="text-h6">Chat del viaje</h1>
        )}
      </header>

      {status === 'loading' && (
        <div className="chat__status loading-area">
          <ConexiaLoader />
        </div>
      )}

      {status === 'error' && (
        <div className="chat__status chat__status--error">
          <p>{loadError ?? 'No pudimos cargar el chat.'}</p>
          <button
            type="button"
            className="chat__retry-button"
            onClick={handleRetry}
          >
            Reintentar
          </button>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="chat__status">
          <p>Este chat ya no está disponible.</p>
          <Button
            type="button"
            variant="outlined"
            size="medium"
            onClick={() => navigate('/chats')}
          >
            Volver a Chats
          </Button>
        </div>
      )}

      {status === 'ready' && trip && (
        <>
          <div className="chat__scroll" ref={scrollRef} onScroll={handleScroll}>
            <section className="chat__trip">
              <div className="chat__trip-top">
                <span className="chat__trip-date">
                  <IconCalendar size={18} color="var(--color-grey-500)" />
                  {formatChatDate(new Date(trip.departureTime))} ·{' '}
                  {formatTime(trip.departureTime)} –{' '}
                  {formatTime(trip.arrivalTime)}
                </span>
                <span className="chat__trip-badge">
                  <IconCheck size={12} color="var(--color-success-500)" />
                  {trip.isDriver ? 'Conducís' : 'Confirmado'}
                </span>
              </div>
              <RouteTimeline
                origin={trip.origin}
                destination={trip.destination}
              />
            </section>

            {messages.length === 0 ? (
              <p className="chat__empty">
                Todavía no hay mensajes. ¡Escribí el primero!
              </p>
            ) : (
              <ol className="chat__messages">
                {messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const isMine = message.authorId === userId;
                  const author = people.find(
                    (person) => person.id === message.authorId,
                  );
                  const isNewDay =
                    !previous || !isSameDay(previous.sentAt, message.sentAt);

                  return (
                    <li key={message.id} className="chat__message-group">
                      {isNewDay && (
                        <span className="chat__day">
                          {formatDaySeparator(message.sentAt)}
                        </span>
                      )}
                      <div
                        className={`chat__message${isMine ? ' chat__message--mine' : ''}`}
                      >
                        {!isMine && (
                          <Avatar
                            className="chat__message-avatar"
                            photoUrl={author?.photoUrl}
                            name={author?.displayName}
                          />
                        )}
                        <div className="chat__bubble">
                          {!isMine && showAuthorNames && (
                            <span className="chat__author">
                              {getPersonName(author?.displayName)}
                            </span>
                          )}
                          <p className="chat__text">{message.text}</p>
                          <time className="chat__time">
                            {formatChatTime(message.sentAt)}
                          </time>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="chat__composer">
            {sendError && (
              <p className="chat__send-error text-body-3" role="alert">
                {sendError}
              </p>
            )}
            <form className="chat__form" onSubmit={handleSubmit}>
              <input
                className="chat__input"
                type="text"
                placeholder="Escribí un mensaje..."
                aria-label="Mensaje"
                maxLength={MAX_MESSAGE_LENGTH}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button
                type="submit"
                className="chat__send"
                aria-label="Enviar mensaje"
                disabled={!text.trim()}
              >
                <IconSend size={22} color="var(--color-white)" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
