import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { Metric } from './metric-names';
import { MetricsService } from './metrics.service';

// Cuenta cada solicitud recibida y las que terminan en 5xx. Se registra al
// cerrarse la respuesta para conocer el status final, incluidos los errores
// que no pasan por los controllers (guards, rutas inexistentes, excepciones)
@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpMetricsMiddleware.name);

  constructor(private readonly metrics: MetricsService) {}

  use(_req: Request, res: Response, next: NextFunction) {
    res.once('close', () => {
      void this.record(res.statusCode);
    });
    next();
  }

  // Un fallo al registrar la métrica no puede afectar la respuesta
  private async record(statusCode: number) {
    try {
      await this.metrics.increment(Metric.API_REQUESTS);
      if (statusCode >= 500 && statusCode <= 599) {
        await this.metrics.increment(Metric.API_ERRORS_5XX);
      }
    } catch (error) {
      this.logger.error(
        'No se pudo registrar la métrica HTTP',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
