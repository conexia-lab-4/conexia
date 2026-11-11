import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RouteDirection } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from '../geo/geo.service';
import { FuelPriceService } from './fuel-price.service';
import { estimateFuel, parseConsumption, roundTo } from './fuel-estimate';

export const CONSUMPTION_CONFIG_KEY = 'FUEL_CONSUMPTION_L_PER_100KM';

export type FuelUnavailableReason =
  'INVALID_CONSUMPTION' | 'NO_ROUTE' | 'PRICE_UNAVAILABLE';

interface LegBase {
  tripId: string;
  routeDirection: RouteDirection | null;
}

export type LegFuelEstimate =
  | (LegBase & {
      available: true;
      distanceKm: number;
      consumptionLPer100Km: number;
      pricePerLiterArs: number;
      liters: number;
      costArs: number;
    })
  | (LegBase & {
      available: false;
      reason: FuelUnavailableReason;
      // Si la ruta se pudo calcular se informa igual, aunque falte otro dato
      distanceKm: number | null;
    });

export interface RoundTripFuelEstimate {
  roundTripId: string;
  legs: LegFuelEstimate[];
  // Solo si los dos tramos tienen estimación: nunca una suma parcial
  total: { liters: number; costArs: number } | null;
}

const LEG_SELECT = {
  id: true,
  routeDirection: true,
  originLat: true,
  originLng: true,
  destinationLat: true,
  destinationLng: true,
} as const;

interface LegRecord {
  id: string;
  routeDirection: RouteDirection | null;
  originLat: number | null;
  originLng: number | null;
  destinationLat: number | null;
  destinationLng: number | null;
}

@Injectable()
export class FuelEstimateService {
  private readonly logger = new Logger(FuelEstimateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly prices: FuelPriceService,
    private readonly config: ConfigService,
  ) {}

  // Recorrido simple: lo ve quien puede ver el viaje
  async estimateTrip(tripId: string): Promise<LegFuelEstimate> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: LEG_SELECT,
    });
    if (!trip) {
      throw new NotFoundException('El viaje no existe');
    }

    const [leg] = await this.estimateLegs([trip]);
    return leg;
  }

  // Paquete con auto: solo lo ve quien lo publicó. Un paquete de intenciones
  // no tiene auto propio y se responde igual que uno inexistente
  async estimateRoundTrip(
    roundTripId: string,
    userId: string,
  ): Promise<RoundTripFuelEstimate> {
    const trips = await this.prisma.trip.findMany({
      where: { roundTripId, driverId: userId },
      orderBy: { departureTime: 'asc' },
      select: LEG_SELECT,
    });
    if (trips.length === 0) {
      throw new NotFoundException('El viaje de ida y vuelta no existe');
    }

    const legs = await this.estimateLegs(trips);
    return { roundTripId, legs, total: sumLegs(legs) };
  }

  private async estimateLegs(trips: LegRecord[]): Promise<LegFuelEstimate[]> {
    const consumption = parseConsumption(
      this.config.get<string>(CONSUMPTION_CONFIG_KEY),
    );

    // Cada tramo tiene su propia ruta: la vuelta no se asume igual a la ida.
    // El precio se consulta una vez para todo el paquete
    const [distances, price] = await Promise.all([
      Promise.all(trips.map((trip) => this.routeDistanceKm(trip))),
      consumption === null ? null : this.prices.getPricePerLiterArs(),
    ]);

    return trips.map((trip, index) => {
      const base = { tripId: trip.id, routeDirection: trip.routeDirection };
      const distanceKm = distances[index];
      const unavailable = (reason: FuelUnavailableReason): LegFuelEstimate => ({
        ...base,
        available: false,
        reason,
        distanceKm: distanceKm === null ? null : roundTo(distanceKm),
      });

      if (consumption === null) return unavailable('INVALID_CONSUMPTION');
      if (distanceKm === null) return unavailable('NO_ROUTE');
      if (price === null) return unavailable('PRICE_UNAVAILABLE');

      const { liters, costArs } = estimateFuel(distanceKm, consumption, price);
      return {
        ...base,
        available: true,
        distanceKm: roundTo(distanceKm),
        consumptionLPer100Km: consumption,
        pricePerLiterArs: price,
        liters: roundTo(liters),
        costArs: roundTo(costArs),
      };
    });
  }

  // Distancia vial entre los extremos del tramo. Sin coordenadas, sin ruta o
  // con el proveedor caído no hay distancia: nunca se reemplaza por cero
  private async routeDistanceKm(trip: LegRecord): Promise<number | null> {
    const { originLat, originLng, destinationLat, destinationLng } = trip;
    if (
      originLat === null ||
      originLng === null ||
      destinationLat === null ||
      destinationLng === null
    ) {
      return null;
    }

    try {
      const km = await this.geo.getRouteDistanceKm([
        { lat: originLat, lng: originLng },
        { lat: destinationLat, lng: destinationLng },
      ]);
      return km !== null && Number.isFinite(km) && km > 0 ? km : null;
    } catch (error) {
      this.logger.warn(
        `No pudimos calcular la ruta del viaje ${trip.id}: ${String(error)}`,
      );
      return null;
    }
  }
}

// Ida y vuelta disponibles: se suman los valores que ve el usuario en cada
// tramo, para que el total coincida con la suma visible
export function sumLegs(
  legs: LegFuelEstimate[],
): RoundTripFuelEstimate['total'] {
  if (legs.length !== 2) return null;
  const totals = { liters: 0, costArs: 0 };
  for (const leg of legs) {
    if (!leg.available) return null;
    totals.liters += leg.liters;
    totals.costArs += leg.costArs;
  }
  return { liters: roundTo(totals.liters), costArs: roundTo(totals.costArs) };
}
