import { authFetch } from './api';

export interface Campus {
  id: string;
  universityId: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export async function getUniversityCampuses(
  universityId: string,
): Promise<Campus[]> {
  const response = await authFetch(
    `/universities/${encodeURIComponent(universityId)}/campuses`,
  );

  if (!response.ok) {
    throw new Error('No pudimos cargar las sedes');
  }

  return response.json();
}

export interface CatalogUniversity {
  id: string;
  name: string;
}

export async function getUniversities(): Promise<CatalogUniversity[]> {
  const response = await authFetch('/universities');

  if (!response.ok) {
    throw new Error('No pudimos cargar las universidades');
  }

  return response.json();
}
