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
