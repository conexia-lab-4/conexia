import { Coordinates, GeoService } from './geo.service';

interface Route {
  origin: Coordinates;
  destination: Coordinates;
}

// Km extra que hace el conductor para pasar a buscar y dejar al pasajero:
// origen conductor → origen pasajero → destino pasajero → destino conductor
export async function computeDetourKm(
  geo: GeoService,
  driver: Route,
  passenger: Route,
): Promise<number | null> {
  const [direct, withPassenger] = await Promise.all([
    geo.getRouteDistanceKm([driver.origin, driver.destination]),
    geo.getRouteDistanceKm([
      driver.origin,
      passenger.origin,
      passenger.destination,
      driver.destination,
    ]),
  ]);

  if (direct === null || withPassenger === null) return null;
  return withPassenger - direct;
}
