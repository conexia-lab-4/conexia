import type { CardColorVariant } from '../../components/selectablecard';

export interface University {
  id: string;
  abbreviation: string;
  name: string;
  campus: string;
  colorVariant: CardColorVariant;
}

export const UNIVERSITIES: University[] = [
  {
    id: 'ua',
    abbreviation: 'UA',
    name: 'Universidad Austral',
    campus: 'Pilar',
    colorVariant: 'blue',
  },
  {
    id: 'dt',
    abbreviation: 'DT',
    name: 'Universidad Torcuato Di Tella',
    campus: 'Belgrano',
    colorVariant: 'green',
  },
  {
    id: 'uba',
    abbreviation: 'UBA',
    name: 'Universidad de Buenos Aires',
    campus: 'Varias sedes',
    colorVariant: 'blue',
  },
  {
    id: 'uca',
    abbreviation: 'UCA',
    name: 'Universidad Católica Argentina',
    campus: 'Puerto Madero',
    colorVariant: 'green',
  },
  {
    id: 'itba',
    abbreviation: 'ITBA',
    name: 'Instituto Tecnológico de Buenos Aires',
    campus: 'Parque Patricios',
    colorVariant: 'blue',
  },
  {
    id: 'uade',
    abbreviation: 'UADE',
    name: 'Universidad Argentina de la Empresa',
    campus: 'Monserrat',
    colorVariant: 'green',
  },
  {
    id: 'up',
    abbreviation: 'UP',
    name: 'Universidad de Palermo',
    campus: 'Palermo',
    colorVariant: 'blue',
  },
  {
    id: 'other',
    abbreviation: '+',
    name: 'Otra Universidad',
    campus: 'Buscar manualmente',
    colorVariant: 'green',
  },
];
