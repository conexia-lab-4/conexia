import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { FuelEstimateService } from './fuel-estimate.service';

// Endpoints aparte del detalle: si la ruta o Argly fallan, el viaje se sigue
// consultando igual y solo la estimación queda no disponible
@Controller()
@UseGuards(FirebaseAuthGuard)
export class FuelEstimatesController {
  constructor(private readonly fuelEstimates: FuelEstimateService) {}

  @Get('trips/:id/fuel-estimate')
  estimateTrip(@Param('id') id: string) {
    return this.fuelEstimates.estimateTrip(id);
  }

  @Get('round-trips/:id/fuel-estimate')
  estimateRoundTrip(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.fuelEstimates.estimateRoundTrip(id, user.id);
  }
}
