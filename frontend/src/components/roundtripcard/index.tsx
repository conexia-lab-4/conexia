import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronDown } from '../../assets/icons/IconChevronDown';
import './index.css';

interface RoundTripGroupProps {
  roundTripId: string;
  // Las tarjetas de los tramos, las mismas que en las listas simples
  children: ReactNode;
}

// Los tramos de un paquete, pegados en un solo bloque. La franja lleva al
// detalle del paquete
export function RoundTripGroup({ roundTripId, children }: RoundTripGroupProps) {
  return (
    <div className="round-trip-group">
      <Link
        to={`/trips/round-trips/${roundTripId}`}
        className="round-trip-group__header text-body-3-bold"
      >
        Ida y vuelta
        <span className="round-trip-group__chevron">
          <IconChevronDown size={16} color="var(--color-primary-800)" />
        </span>
      </Link>
      {children}
    </div>
  );
}
