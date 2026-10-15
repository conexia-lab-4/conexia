import {
  Controller,
  Get,
  INestApplication,
  InternalServerErrorException,
  Logger,
  Module,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { MetricsModule } from './metrics.module';
import { KpiCalculatorService } from './kpi-calculator.service';
import { MetricsService } from './metrics.service';

@Controller('probe')
class ProbeController {
  @Get('ok')
  ok() {
    return 'ok';
  }

  @Get('boom')
  boom() {
    throw new InternalServerErrorException();
  }
}

@Module({ imports: [MetricsModule], controllers: [ProbeController] })
class ProbeModule {}

describe('HttpMetricsMiddleware', () => {
  let app: INestApplication<App>;
  let metricsMock: { increment: jest.Mock; recordEvents: jest.Mock };

  // La métrica se registra al cerrarse la respuesta, después de que supertest
  // ya la recibió
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    metricsMock = { increment: jest.fn(), recordEvents: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    })
      .overrideProvider(MetricsService)
      .useValue(metricsMock)
      .overrideProvider(KpiCalculatorService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('cuenta una solicitud exitosa sin contarla como error', async () => {
    await request(app.getHttpServer()).get('/probe/ok').expect(200);
    await flush();

    expect(metricsMock.increment).toHaveBeenCalledTimes(1);
    expect(metricsMock.increment).toHaveBeenCalledWith('api_requests');
  });

  it('cuenta las rutas inexistentes como solicitudes', async () => {
    await request(app.getHttpServer()).get('/no-existe').expect(404);
    await flush();

    expect(metricsMock.increment).toHaveBeenCalledTimes(1);
    expect(metricsMock.increment).toHaveBeenCalledWith('api_requests');
  });

  it('cuenta las respuestas 5xx como errores internos', async () => {
    await request(app.getHttpServer()).get('/probe/boom').expect(500);
    await flush();

    expect(metricsMock.increment).toHaveBeenCalledWith('api_requests');
    expect(metricsMock.increment).toHaveBeenCalledWith('api_errors_5xx');
  });

  it('si falla el registro de la métrica la respuesta no se ve afectada', async () => {
    const logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    metricsMock.increment.mockRejectedValue(new Error('db caída'));

    await request(app.getHttpServer()).get('/probe/ok').expect(200);
    await flush();

    expect(logError).toHaveBeenCalled();
  });
});
