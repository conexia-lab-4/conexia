import { IconCheck } from '../../assets/icons/IconCheck';
import './index.css';

export const SUBJECT_COLORS: { id: string; value: string }[] = [
  { id: '1', value: 'var(--color-subject-1)' },
  { id: '2', value: 'var(--color-subject-2)' },
  { id: '3', value: 'var(--color-subject-3)' },
  { id: '4', value: 'var(--color-subject-4)' },
  { id: '5', value: 'var(--color-subject-5)' },
  { id: '6', value: 'var(--color-subject-6)' },
  { id: '7', value: 'var(--color-subject-7)' },
  { id: '8', value: 'var(--color-subject-8)' },
];

interface ColorPickerProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div
      className="color-picker"
      role="radiogroup"
      aria-label="Color de la materia"
    >
      {SUBJECT_COLORS.map(({ id, value }) => {
        const isSelected = selected === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Color ${id}`}
            className="color-picker__swatch"
            style={{ backgroundColor: value }}
            onClick={() => onSelect(id)}
          >
            {isSelected && <IconCheck size={20} color="var(--color-white)" />}
          </button>
        );
      })}
    </div>
  );
}
