import { useState } from 'react';
import { IconCheck } from '../../assets/icons/IconCheck';
import { IconInfo } from '../../assets/icons/IconInfo';
import { IconSeatBelt } from '../../assets/icons/IconSeatBelt';
import { SEAT_LABELS, SEAT_ORDER, type SeatPosition } from './constants';
import './index.css';

interface SeatSelectorProps {
  value: number;
  onChange: (seats: number) => void;
}

export function SeatSelector({ value, onChange }: SeatSelectorProps) {
  const [selected, setSelected] = useState<SeatPosition[]>(() =>
    SEAT_ORDER.slice(0, value),
  );

  // Si el valor cambia desde afuera (ej. al recargar el perfil), se vuelve
  // al orden por defecto para que lo marcado coincida con la cantidad.
  const visibleSelected =
    selected.length === value ? selected : SEAT_ORDER.slice(0, value);

  const toggleSeat = (position: SeatPosition) => {
    const next = visibleSelected.includes(position)
      ? visibleSelected.filter((p) => p !== position)
      : [...visibleSelected, position];
    setSelected(next);
    onChange(next.length);
  };

  const count = visibleSelected.length;

  return (
    <div className="seat-selector">
      <div className="seat-selector__car">
        <CarTopView />
        <span
          className="seat-selector__seat seat-selector__seat--driver seat-selector__seat--front-left"
          aria-label="Asiento del conductor"
          title="Asiento del conductor"
        />
        {SEAT_ORDER.map((position) => {
          const isSelected = visibleSelected.includes(position);
          return (
            <button
              key={position}
              type="button"
              aria-pressed={isSelected}
              aria-label={SEAT_LABELS[position]}
              className={`seat-selector__seat seat-selector__seat--${position}${
                isSelected ? ' seat-selector__seat--selected' : ''
              }`}
              onClick={() => toggleSeat(position)}
            >
              {isSelected && (
                <span className="seat-selector__check">
                  <IconCheck size={14} color="var(--color-white)" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="seat-selector__side">
        <div className="seat-selector__summary">
          <span className="seat-selector__summary-icon">
            <IconSeatBelt size={20} color="var(--color-primary-700)" />
          </span>
          <span className="text-body-2-bold" aria-live="polite">
            {count}{' '}
            {count === 1 ? 'asiento seleccionado' : 'asientos seleccionados'}
          </span>
        </div>
        <p className="seat-selector__note text-body-3">
          <IconInfo size={16} color="var(--color-grey-400)" />
          El asiento del conductor no puede seleccionarse.
        </p>
      </div>
    </div>
  );
}

function CarTopView() {
  return (
    <svg
      className="seat-selector__car-svg"
      viewBox="0 0 220 400"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Espejos */}
      <path d="M26 136 L4 149 Q2 150 2 153 V160 L26 148 Z" fill="#4a5561" />
      <path
        d="M194 136 L216 149 Q218 150 218 153 V160 L194 148 Z"
        fill="#4a5561"
      />

      {/* Carrocería */}
      <rect
        x="22"
        y="6"
        width="176"
        height="388"
        rx="50"
        fill="#a7abb1"
        stroke="#c9dbe6"
        strokeWidth="2"
      />

      {/* Luces traseras */}
      <path
        d="M23 338 Q23 388 74 394 L76 388 Q30 380 29 338 Z"
        fill="#e8414a"
      />
      <path
        d="M197 338 Q197 388 146 394 L144 388 Q190 380 191 338 Z"
        fill="#e8414a"
      />

      {/* Capó, parabrisas y faros */}
      <path d="M66 18 H154 L180 128 H40 Z" fill="#e3e4e7" />
      <rect x="70" y="8" width="80" height="12" rx="3" fill="#4b4f55" />
      <path d="M30 64 Q32 26 62 13 L67 19 Q44 31 38 68 Z" fill="#ffffff" />
      <path
        d="M190 64 Q188 26 158 13 L153 19 Q176 31 182 68 Z"
        fill="#ffffff"
      />

      {/* Habitáculo */}
      <rect x="34" y="126" width="152" height="240" rx="14" fill="#8e9297" />
      <rect x="40" y="152" width="140" height="206" rx="10" fill="#1f2022" />

      {/* Tablero con volante del lado del conductor */}
      <rect x="40" y="131" width="140" height="21" rx="4" fill="#3d4044" />
      <rect x="44" y="137" width="5" height="10" rx="2" fill="#6b6f74" />
      <rect x="171" y="137" width="5" height="10" rx="2" fill="#6b6f74" />
      <rect x="110" y="138" width="16" height="2.5" rx="1" fill="#6b6f74" />
      <rect x="130" y="138" width="10" height="2.5" rx="1" fill="#6b6f74" />
      <rect x="110" y="144" width="44" height="2" rx="1" fill="#55595e" />
      <circle
        cx="76"
        cy="146"
        r="10"
        fill="none"
        stroke="#2b2d30"
        strokeWidth="3.5"
      />
      <path
        d="M66.5 143 Q76 136 85.5 143"
        fill="none"
        stroke="#f2f2f2"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M67 148 H85" stroke="#2b2d30" strokeWidth="2.5" />
      <circle cx="76" cy="148" r="3" fill="#f2f2f2" />

      {/* Baúl */}
      <path d="M66 374 H154 L148 392 H72 Z" fill="#e3e4e7" />
    </svg>
  );
}

export default SeatSelector;
