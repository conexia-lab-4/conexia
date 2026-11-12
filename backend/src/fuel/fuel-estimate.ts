// Cálculo orientativo de combustible: no es un gasto medido
export function estimateFuel(
  distanceKm: number,
  consumptionLPer100Km: number,
  pricePerLiterArs: number,
): { liters: number; costArs: number } {
  const liters = (distanceKm * consumptionLPer100Km) / 100;
  return { liters, costArs: liters * pricePerLiterArs };
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// El consumo viene de la configuración como texto. Vacío, no numérico, cero o
// negativo es inválido: no hay estimación en lugar de un valor inventado
export function parseConsumption(raw: unknown): number | null {
  if (typeof raw === 'number') return isPositiveNumber(raw) ? raw : null;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const value = Number(raw);
  return isPositiveNumber(value) ? value : null;
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
