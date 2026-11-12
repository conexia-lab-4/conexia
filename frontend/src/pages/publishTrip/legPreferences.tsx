import type { ReactNode } from 'react';
import { NumberStepper } from '../../components/numberstepper';
import { TextField } from '../../components/textfield';
import { IconArmchair } from '../../assets/icons/IconArmchair';
import { IconClock } from '../../assets/icons/IconClock';
import { IconRoute } from '../../assets/icons/IconRoute';
import { parseNumericInput } from '../../lib/numberInput';
import { RouteIllustration } from './routeIllustration';
import type { LegPreferencesValue, WaitOption } from './legPreferencesModel';

const WAIT_OPTIONS: { value: WaitOption; label: string }[] = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: 'custom', label: 'Personalizado' },
];

interface PreferenceCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

function PreferenceCard({
  icon,
  title,
  description,
  children,
}: PreferenceCardProps) {
  return (
    <section className="preference-card">
      <div className="preference-card__header">
        <span className="preference-card__tile">{icon}</span>
        <div className="preference-card__texts">
          <h3 className="preference-card__title text-body-1-bold">{title}</h3>
          <p className="preference-card__description text-body-3">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

interface LegPreferencesProps {
  value: LegPreferencesValue;
  onChange: (value: LegPreferencesValue) => void;
  // Tiempo de viaje del tramo; sin él no se muestra el recuadro de la ruta
  travelLabel?: string;
}

export function LegPreferences({
  value,
  onChange,
  travelLabel,
}: LegPreferencesProps) {
  const update = (patch: Partial<LegPreferencesValue>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="leg-preferences">
      <PreferenceCard
        icon={<IconClock size={20} color="var(--color-primary-600)" />}
        title="Tiempo de espera"
        description="Cuánto podés esperar a tu compañero antes de salir."
      >
        <div className="preference-card__options">
          {WAIT_OPTIONS.map((option) => {
            const selected = option.value === value.wait;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                className={`preference-card__chip ${
                  selected
                    ? 'text-body-2-bold preference-card__chip--selected'
                    : 'text-body-2'
                }`}
                onClick={() => update({ wait: option.value })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {value.wait === 'custom' && (
          <TextField
            variant="filled"
            aria-label="Tiempo de espera en minutos"
            placeholder="Minutos. Ej. 20"
            inputMode="numeric"
            value={value.customWait}
            onChange={(e) =>
              update({ customWait: parseNumericInput(e.target.value, 180) })
            }
          />
        )}
      </PreferenceCard>

      <PreferenceCard
        icon={<IconRoute size={20} color="var(--color-primary-600)" />}
        title="Desvío máximo"
        description="Cuántos km podés desviarte de tu ruta para buscar pasajeros."
      >
        <TextField
          variant="filled"
          aria-label="Desvío máximo en kilómetros"
          placeholder="Ej. 2"
          inputMode="numeric"
          value={value.detourKm}
          onChange={(e) =>
            update({ detourKm: parseNumericInput(e.target.value) })
          }
          rightIcon={
            <NumberStepper
              onIncrement={() =>
                update({ detourKm: String((Number(value.detourKm) || 0) + 1) })
              }
              onDecrement={() =>
                update({
                  detourKm: String(
                    Math.max(0, (Number(value.detourKm) || 0) - 1),
                  ),
                })
              }
              incrementLabel="Aumentar tolerancia de desvío"
              decrementLabel="Disminuir tolerancia de desvío"
            />
          }
        />
        {travelLabel && (
          <div className="route-info">
            <RouteIllustration />
            <div className="route-info__texts">
              <p className="route-info__title text-body-2-bold">
                Tu ruta original
              </p>
              <p className="route-info__body text-body-3">{travelLabel}</p>
            </div>
          </div>
        )}
      </PreferenceCard>

      <PreferenceCard
        icon={<IconArmchair size={20} color="var(--color-primary-600)" />}
        title="Asientos disponibles"
        description="Cuántos lugares ofrecés en este viaje."
      >
        <TextField
          variant="filled"
          aria-label="Asientos disponibles"
          placeholder="Ej. 2"
          inputMode="numeric"
          value={value.seats ? String(value.seats) : ''}
          onChange={(e) =>
            update({ seats: Number(parseNumericInput(e.target.value)) })
          }
          rightIcon={
            <NumberStepper
              onIncrement={() => update({ seats: value.seats + 1 })}
              onDecrement={() =>
                update({ seats: Math.max(1, value.seats - 1) })
              }
              incrementLabel="Aumentar asientos"
              decrementLabel="Disminuir asientos"
            />
          }
        />
      </PreferenceCard>
    </div>
  );
}
