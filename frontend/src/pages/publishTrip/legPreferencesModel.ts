import type { ProfileResponse } from '../../lib/profileApi';

export type WaitOption = '15' | '30' | '60' | 'custom';

// Preferencias de un tramo. El tiempo de espera es solo de pantalla por ahora
export interface LegPreferencesValue {
  wait: WaitOption;
  customWait: string;
  detourKm: string;
  seats: number;
}

// Desvío y asientos arrancan con lo que ya está cargado en el perfil
export function defaultLegPreferences(
  profile: ProfileResponse | null,
): LegPreferencesValue {
  return {
    wait: '30',
    customWait: '',
    detourKm:
      profile?.detourToleranceKm != null
        ? String(profile.detourToleranceKm)
        : '',
    seats: Math.max(1, profile?.availableSeats ?? 1),
  };
}

export function validateLegPreferences(
  value: LegPreferencesValue,
): string | null {
  if (value.wait === 'custom' && !(Number(value.customWait) > 0)) {
    return 'Ingresá el tiempo de espera en minutos.';
  }
  if (value.seats < 1) return 'Ofrecé al menos un asiento.';
  return null;
}
