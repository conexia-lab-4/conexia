import { useId } from 'react';
import { IconArrowsLeftRight } from '../../assets/icons/IconArrowsLeftRight';
import { IconCar } from '../../assets/icons/IconCar';
import './index.css';

export type TripType = 'ONE_WAY' | 'ROUND_TRIP';

interface TripTypeSelectorProps {
  value: TripType;
  onChange: (value: TripType) => void;
  roundTripDisabled?: boolean;
  disabledNote?: string;
}

export function TripTypeSelector({
  value,
  onChange,
  roundTripDisabled = false,
  disabledNote,
}: TripTypeSelectorProps) {
  const titleId = useId();

  const options: { value: TripType; label: string; disabled: boolean }[] = [
    { value: 'ONE_WAY', label: 'Solo ida', disabled: false },
    { value: 'ROUND_TRIP', label: 'Ida y vuelta', disabled: roundTripDisabled },
  ];

  return (
    <section className="trip-type">
      <h2 id={titleId} className="trip-type__title text-body-1-bold">
        Tipo de viaje
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
              disabled={option.disabled}
              className={`trip-type__option text-body-2-bold${
                selected ? ' trip-type__option--selected' : ''
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.value === 'ONE_WAY' ? (
                <IconCar size={20} color="var(--color-primary-700)" />
              ) : (
                <IconArrowsLeftRight
                  size={20}
                  color="var(--color-primary-700)"
                />
              )}
              {option.label}
              <span className="trip-type__radio" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      {roundTripDisabled && disabledNote && (
        <p className="trip-type__note text-body-3">{disabledNote}</p>
      )}
    </section>
  );
}
