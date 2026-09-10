import { authFetch } from './api';

export interface Subject {
  id: string;
  name: string;
}

export async function getSubjects(): Promise<Subject[]> {
  const response = await authFetch('/subjects');

  if (!response.ok) {
    throw new Error('No se pudieron obtener las materias');
  }

  return response.json();
}
