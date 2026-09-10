import './index.css';

export type DayValue =
  'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export const DAY_OPTIONS: { value: DayValue; label: string }[] = [
  { value: 'MONDAY', label: 'Lun' },
  { value: 'TUESDAY', label: 'Mar' },
  { value: 'WEDNESDAY', label: 'Mié' },
  { value: 'THURSDAY', label: 'Jue' },
  { value: 'FRIDAY', label: 'Vie' },
];

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
            className={`day-selector__pill${
              isSelected ? ' day-selector__pill--selected' : ''
            }`}
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
