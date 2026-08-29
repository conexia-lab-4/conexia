import type { ReactNode } from 'react';
import { IconCheck } from '../../assets/icons/IconCheck';
import './index.css';

export type CardColorVariant = 'blue' | 'green' | 'none';

interface SelectableCardProps {
  badge: ReactNode;
  colorVariant: CardColorVariant;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
  showRadio?: boolean;
  centered?: boolean;
}

export function SelectableCard({
  badge,
  colorVariant,
  title,
  subtitle,
  selected,
  onClick,
  showRadio = true,
  centered = false,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      className={[
        'selectable-card',
        selected && 'selectable-card--selected',
        centered && 'selectable-card--centered',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
    >
      {showRadio && (
        <span className="selectable-card__radio">
          {selected && <IconCheck size={12} color="var(--color-white)" />}
        </span>
      )}
      <span
        className={`selectable-card__badge selectable-card__badge--${colorVariant} text-body-3-bold`}
      >
        {badge}
      </span>
      <span className="selectable-card__title">{title}</span>
      <span className="selectable-card__subtitle">{subtitle}</span>
    </button>
  );
}

export default SelectableCard;
