import { useEffect, useRef, useState } from 'react';
import {
  WheelPicker,
  WheelPickerWrapper,
  type WheelPickerOption,
} from '@ncdai/react-wheel-picker';
import '@ncdai/react-wheel-picker/style.css';
import { IconClock } from '../../assets/icons/IconClock';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import './index.css';

interface TimeFieldProps {
  value: string; // "HH:MM" o ""
  onChange: (value: string) => void;
  ariaLabel?: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

const HOUR_OPTIONS: WheelPickerOption[] = Array.from(
  { length: 24 },
  (_, i) => ({
    value: pad(i),
    label: pad(i),
  }),
);

const MINUTE_OPTIONS: WheelPickerOption[] = Array.from(
  { length: 60 },
  (_, i) => ({ value: pad(i), label: pad(i) }),
);

export function TimeField({ value, onChange, ariaLabel }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentHour = value ? value.split(':')[0] : '08';
  const currentMinute = value ? value.split(':')[1] : '00';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="time-field" ref={containerRef}>
      <button
        type="button"
        className="time-field__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <IconClock size={20} color="var(--color-grey-400)" />
        <span
          className={`time-field__value${
            value ? '' : ' time-field__value--placeholder'
          }`}
        >
          {value || '--:--'}
        </span>
        <IconChevronDown size={20} color="var(--color-grey-400)" />
      </button>

      {open && (
        <div className="time-field__popover">
          <WheelPickerWrapper className="time-field__wheels">
            <WheelPicker
              options={HOUR_OPTIONS}
              value={currentHour}
              onValueChange={(h) => onChange(`${h}:${currentMinute}`)}
              infinite
              visibleCount={12}
            />
            <WheelPicker
              options={MINUTE_OPTIONS}
              value={currentMinute}
              onValueChange={(m) => onChange(`${currentHour}:${m}`)}
              infinite
              visibleCount={12}
            />
          </WheelPickerWrapper>
          <button
            type="button"
            className="time-field__done"
            onClick={() => setOpen(false)}
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
