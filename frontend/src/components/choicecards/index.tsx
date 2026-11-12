import { useId, type ReactNode } from 'react';
import '../triptypeselector/index.css';

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
}

interface ChoiceCardsProps<T extends string> {
  title: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
}

// Mismas cajitas que "Tipo de viaje", pero con opciones configurables
export function ChoiceCards<T extends string>({
  title,
  value,
  options,
  onChange,
}: ChoiceCardsProps<T>) {
  const titleId = useId();

  return (
    <section className="trip-type">
      <h2 id={titleId} className="trip-type__title text-body-1-bold">
        {title}
      </h2>
      <div
        className="trip-type__options"
        role="radiogroup"
        aria-labelledby={titleId}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`trip-type__option text-body-2-bold${
                selected ? ' trip-type__option--selected' : ''
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.icon}
              {option.label}
              <span className="trip-type__radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
