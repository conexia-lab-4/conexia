import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { KpiCalculatorService } from './kpi-calculator.service';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  providers: [MetricsService, KpiCalculatorService],
  exports: [MetricsService, KpiCalculatorService],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpMetricsMiddleware).forRoutes('*');
  }
}
