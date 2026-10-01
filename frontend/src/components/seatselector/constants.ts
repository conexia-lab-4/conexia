export type SeatPosition = 'front-right' | 'rear-left' | 'rear-right';

// Orden en el que se marcan los asientos al cargar una cantidad guardada,
// porque la API persiste solo cuántos asientos se ofrecen, no cuáles.
export const SEAT_ORDER: SeatPosition[] = [
  'front-right',
  'rear-right',
  'rear-left',
];

export const SEAT_LABELS: Record<SeatPosition, string> = {
  'front-right': 'Asiento del acompañante',
  'rear-left': 'Asiento trasero izquierdo',
  'rear-right': 'Asiento trasero derecho',
};

export const MAX_AVAILABLE_SEATS = SEAT_ORDER.length;
