import './index.css';
import { DAY_OPTIONS, type DayValue } from './constants';

export type { DayValue } from './constants';

interface DaySelectorProps {
  selected: DayValue[];
  onToggle: (day: DayValue) => void;
}

export function DaySelector({ selected, onToggle }: DaySelectorProps) {
  return (
    <div className="day-selector" role="group" aria-label="Días de la semana">
      {DAY_OPTIONS.map(({ value, label }) => {
        const isSelected = selected.includes(value);
        return (
          <button
            key={value}
            type="button"
            className={`day-selector__pill${isSelected ? ' day-selector__pill--selected' : ''}`}
            aria-pressed={isSelected}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
