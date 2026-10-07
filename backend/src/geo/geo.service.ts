export interface Coordinates {
  lat: number;
  lng: number;
}

// Abstracción del proveedor de geolocalización. La lógica de dominio depende
// solo de esta clase; la implementación concreta se elige en GeoModule.
export abstract class GeoService {
  /** Devuelve null si la dirección no se puede resolver. */
  abstract geocode(address: string): Promise<Coordinates | null>;

  /** Distancia en km recorriendo los puntos en orden (mínimo 2). Null si no hay ruta. */
  abstract getRouteDistanceKm(points: Coordinates[]): Promise<number | null>;
}
