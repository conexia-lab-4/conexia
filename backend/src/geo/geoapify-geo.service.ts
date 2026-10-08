import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Coordinates, GeoService } from './geo.service';

const GEOCODING_URL = 'https://api.geoapify.com/v1/geocode/search';
const ROUTING_URL = 'https://api.geoapify.com/v1/routing';

// Geoapify casi siempre devuelve algún resultado, aunque la dirección no
// exista; por debajo de esta confianza se considera no resuelta
const MIN_CONFIDENCE = 0.5;

interface GeocodingResponse {
  results?: { lat: number; lon: number; rank?: { confidence?: number } }[];
}

interface RoutingResponse {
  features?: { properties?: { distance?: number } }[];
}

@Injectable()
export class GeoapifyGeoService extends GeoService {
  private readonly apiKey: string;

  constructor(config: ConfigService) {
    super();
    this.apiKey = config.getOrThrow<string>('GEOAPIFY_API_KEY');
  }

  async geocode(address: string): Promise<Coordinates | null> {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set('text', address);
    url.searchParams.set('filter', 'countrycode:ar');
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('apiKey', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'No pudimos validar la dirección, intentá más tarde',
      );
    }

    const body = (await response.json()) as GeocodingResponse;
    const result = body.results?.[0];
    if (!result || (result.rank?.confidence ?? 0) < MIN_CONFIDENCE) {
      return null;
    }
    return { lat: result.lat, lng: result.lon };
  }

  async getRouteDistanceKm(points: Coordinates[]): Promise<number | null> {
    if (points.length < 2) {
      throw new Error(
        'Se necesitan al menos dos puntos para calcular una ruta',
      );
    }

    const url = new URL(ROUTING_URL);
    url.searchParams.set(
      'waypoints',
      points.map(({ lat, lng }) => `${lat},${lng}`).join('|'),
    );
    url.searchParams.set('mode', 'drive');
    url.searchParams.set('apiKey', this.apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException('No pudimos calcular la ruta');
    }

    const body = (await response.json()) as RoutingResponse;
    const meters = body.features?.[0]?.properties?.distance;
    return typeof meters === 'number' ? meters / 1000 : null;
  }
}
