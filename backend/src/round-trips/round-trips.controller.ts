import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { RoundTripsService } from './round-trips.service';
import { CreateRoundTripDto } from './dto/create-round-trip.dto';

@Controller('round-trips')
@UseGuards(FirebaseAuthGuard)
export class RoundTripsController {
  constructor(private readonly roundTripsService: RoundTripsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoundTripDto,
  ) {
    return this.roundTripsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roundTripsService.findOneOrThrow(id, user.id);
  }
}
