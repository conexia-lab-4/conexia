import type {
  FuelUnavailableReason,
  LegFuelEstimate,
} from '../../lib/fuelEstimateApi';

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const pricePerLiter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

const oneDecimal = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 1,
});

const REASON_LABEL: Record<FuelUnavailableReason, string> = {
  INVALID_CONSUMPTION: 'No hay un consumo de referencia configurado.',
  NO_ROUTE: 'No pudimos calcular la ruta de este tramo.',
  PRICE_UNAVAILABLE: 'No pudimos obtener el precio del combustible.',
};

export const formatCost = (ars: number) => currency.format(ars);
export const formatPricePerLiter = (ars: number) =>
  `${pricePerLiter.format(ars)}/L`;
export const formatKm = (km: number) => `${oneDecimal.format(km)} km`;
export const formatLiters = (liters: number) =>
  `${oneDecimal.format(liters)} L`;
export const formatConsumption = (lPer100Km: number) =>
  `${oneDecimal.format(lPer100Km)} L/100 km`;

export function getReasonLabel(reason: FuelUnavailableReason): string {
  return REASON_LABEL[reason];
}

// En un paquete se distingue ida y vuelta; un viaje simple es "Recorrido"
export function getLegTitle(leg: LegFuelEstimate, isPackage: boolean): string {
  if (!isPackage) return 'Recorrido';
  if (leg.routeDirection === 'TO_CAMPUS') return 'Ida';
  if (leg.routeDirection === 'FROM_CAMPUS') return 'Vuelta';
  return 'Tramo';
}
