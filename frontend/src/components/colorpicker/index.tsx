import { IconCheck } from '../../assets/icons/IconCheck';
import { SUBJECT_COLORS } from './constants';
import './index.css';

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
