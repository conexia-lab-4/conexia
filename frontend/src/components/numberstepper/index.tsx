import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import './index.css';

interface NumberStepperProps {
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel?: string;
  decrementLabel?: string;
}

export function NumberStepper({
  onIncrement,
  onDecrement,
  incrementLabel = 'Aumentar',
  decrementLabel = 'Disminuir',
}: NumberStepperProps) {
  return (
    <span className="number-stepper">
      <button
        type="button"
        className="number-stepper__btn number-stepper__btn--up"
        onClick={onIncrement}
        aria-label={incrementLabel}
      >
        <IconChevronDown size={10} color="var(--color-grey-400)" />
      </button>
      <button
        type="button"
        className="number-stepper__btn"
        onClick={onDecrement}
        aria-label={decrementLabel}
      >
        <IconChevronDown size={10} color="var(--color-grey-400)" />
      </button>
    </span>
  );
}

export default NumberStepper;
