import { Injectable, Logger } from '@nestjs/common';
import { isPositiveNumber } from './fuel-estimate';

const ARGLY_URL = 'https://api.argly.com.ar/v1/combustibles/promedio';
const PROVINCE = 'Buenos Aires';
const FUEL = 'Nafta Super';
const REQUEST_TIMEOUT_MS = 5000;
// El promedio no cambia de un minuto a otro: se reutiliza un rato para no
// consultar Argly en cada detalle de viaje
const CACHE_TTL_MS = 30 * 60 * 1000;

interface ArglyResponse {
  data?: { precio_promedio?: unknown };
}

@Injectable()
export class FuelPriceService {
  private readonly logger = new Logger(FuelPriceService.name);
  private cached: { price: number; expiresAt: number } | null = null;

  /**
   * Precio promedio de Nafta Súper en Buenos Aires, en ARS/L. Null si Argly
   * falla o devuelve un precio que no es un número positivo. Nunca lanza: la
   * estimación es opcional y no debe bloquear la consulta del viaje
   */
  async getPricePerLiterArs(): Promise<number | null> {
    const now = Date.now();
    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.price;
    }

    const url = new URL(ARGLY_URL);
    url.searchParams.set('provincia', PROVINCE);
    url.searchParams.set('combustible', FUEL);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(`Argly respondió ${response.status}`);
        return null;
      }

      const body = (await response.json()) as ArglyResponse;
      const price = body?.data?.precio_promedio;
      if (!isPositiveNumber(price)) {
        this.logger.warn('Argly devolvió un precio inválido');
        return null;
      }

      this.cached = { price, expiresAt: now + CACHE_TTL_MS };
      return price;
    } catch (error) {
      this.logger.warn(`No pudimos consultar Argly: ${String(error)}`);
      return null;
    }
  }
}
