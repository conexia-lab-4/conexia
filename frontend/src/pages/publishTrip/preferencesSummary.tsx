import { IconArmchair } from '../../assets/icons/IconArmchair';
import { IconClock } from '../../assets/icons/IconClock';
import { IconRoute } from '../../assets/icons/IconRoute';
import { IconSliders } from '../../assets/icons/IconSliders';
import {
  formatWaitTime,
  type LegPreferencesValue,
} from './legPreferencesModel';

interface PreferencesSummaryProps {
  value: LegPreferencesValue;
  // Solo el tiempo de espera (la búsqueda de viaje no tiene desvío ni asientos)
  waitOnly?: boolean;
}

export function PreferencesSummary({
  value,
  waitOnly = false,
}: PreferencesSummaryProps) {
  const rows = [
    {
      icon: <IconClock size={16} color="var(--color-primary-600)" />,
      label: 'Tiempo de espera',
      value: formatWaitTime(value),
    },
    ...(waitOnly
      ? []
      : [
          {
            icon: <IconRoute size={16} color="var(--color-primary-600)" />,
            label: 'Desvío máximo',
            value: value.detourKm === '' ? '-' : `${value.detourKm} km`,
          },
          {
            icon: <IconArmchair size={16} color="var(--color-primary-600)" />,
            label: 'Asientos disponibles',
            value: String(value.seats),
          },
        ]),
  ];

  return (
    <section className="preferences-summary">
      <div className="preferences-summary__header">
        <IconSliders size={18} color="var(--color-primary-600)" />
        <h3 className="text-body-2-bold">Preferencias</h3>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="preferences-summary__row">
          {row.icon}
          <span className="preferences-summary__label text-body-3">
            {row.label}
          </span>
          <span className="text-body-3-bold">{row.value}</span>
        </div>
      ))}
    </section>
  );
}
