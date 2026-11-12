import type { ReactNode } from 'react';
import './index.css';

interface RoundTripGroupProps {
  // Las tarjetas de los tramos, las mismas que en las listas simples
  children: ReactNode;
}

// Los tramos de un paquete, pegados en un solo bloque
export function RoundTripGroup({ children }: RoundTripGroupProps) {
  return (
    <div className="round-trip-group">
      <div className="round-trip-group__header text-body-3-bold">
        Ida y vuelta
      </div>
      {children}
    </div>
  );
}
