export interface Match {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  career: string;
  year: number;
  campus: string;
  hasCar: boolean;
  availableSeats?: number;
  hasSimilarSchedule: boolean;
  compatibilityPercent: number;
  sameCampus: boolean;
  sameCareer: boolean;
}

const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    name: 'Juan Martínez',
    photoUrl: 'https://i.pravatar.cc/150?img=12',
    isOnline: true,
    career: 'Ingeniería Informática',
    year: 3,
    campus: 'Sede Pilar',
    hasCar: true,
    availableSeats: 2,
    hasSimilarSchedule: true,
    compatibilityPercent: 92,
    sameCampus: true,
    sameCareer: true,
  },
  {
    id: '2',
    name: 'Valentina Rossi',
    photoUrl: 'https://i.pravatar.cc/150?img=47',
    isOnline: true,
    career: 'Medicina',
    year: 1,
    campus: 'Sede Pilar',
    hasCar: true,
    availableSeats: 1,
    hasSimilarSchedule: false,
    compatibilityPercent: 86,
    sameCampus: true,
    sameCareer: false,
  },
  {
    id: '3',
    name: 'Sofia Garcia',
    photoUrl: 'https://i.pravatar.cc/150?img=32',
    isOnline: true,
    career: 'Medicina',
    year: 1,
    campus: 'Sede Pilar',
    hasCar: false,
    hasSimilarSchedule: true,
    compatibilityPercent: 72,
    sameCampus: true,
    sameCareer: false,
  },
  {
    id: '4',
    name: 'Juana Rosseti',
    photoUrl: 'https://i.pravatar.cc/150?img=44',
    isOnline: true,
    career: 'Medicina',
    year: 1,
    campus: 'Sede Pilar',
    hasCar: false,
    hasSimilarSchedule: true,
    compatibilityPercent: 72,
    sameCampus: true,
    sameCareer: false,
  },
  {
    id: '5',
    name: 'Martín López',
    photoUrl: 'https://i.pravatar.cc/150?img=8',
    isOnline: false,
    career: 'Administración de Empresas',
    year: 2,
    campus: 'Sede Centro',
    hasCar: true,
    availableSeats: 3,
    hasSimilarSchedule: false,
    compatibilityPercent: 65,
    sameCampus: false,
    sameCareer: false,
  },
  {
    id: '6',
    name: 'Camila Fernández',
    photoUrl: 'https://i.pravatar.cc/150?img=20',
    isOnline: false,
    career: 'Ingeniería Informática',
    year: 4,
    campus: 'Sede Centro',
    hasCar: false,
    hasSimilarSchedule: false,
    compatibilityPercent: 58,
    sameCampus: false,
    sameCareer: true,
  },
];

export async function getMatches(): Promise<Match[]> {
  return Promise.resolve(MOCK_MATCHES);
}
