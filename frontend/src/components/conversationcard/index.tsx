import { Link } from 'react-router-dom';
import { Avatar } from '../avatar';
import { IconCar } from '../../assets/icons/IconCar';
import type { Conversation } from '../../lib/chatApi';
import {
  formatChatDate,
  formatChatTime,
  formatConversationTime,
  formatLastMessage,
  getConversationHeading,
} from '../../lib/chatFormat';
import './index.css';

interface ConversationCardProps {
  conversation: Conversation;
  userId: string;
}

export function ConversationCard({
  conversation,
  userId,
}: ConversationCardProps) {
  const { tripId, destination, departureTime, people, lastMessage, updatedAt } =
    conversation;
  const { title, person } = getConversationHeading(people, userId, destination);

  return (
    <Link to={`/chats/${tripId}`} className="conversation-card">
      {person ? (
        <Avatar
          className="conversation-card__avatar"
          photoUrl={person.photoUrl}
          name={person.displayName}
        />
      ) : (
        <span className="conversation-card__avatar">
          <IconCar size={22} color="var(--color-primary-500)" />
        </span>
      )}

      <div className="conversation-card__body">
        <div className="conversation-card__top">
          <span className="conversation-card__title">{title}</span>
          <span className="conversation-card__time">
            {formatConversationTime(updatedAt)}
          </span>
        </div>
        <p className="conversation-card__trip">
          {formatChatDate(departureTime)} · {formatChatTime(departureTime)} ·{' '}
          {destination}
        </p>
        <p className="conversation-card__message">
          {formatLastMessage(lastMessage, people, userId)}
        </p>
      </div>
    </Link>
  );
}
