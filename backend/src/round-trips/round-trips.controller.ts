import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { RoundTripsService } from './round-trips.service';
import { RoundTripMatchesService } from './round-trip-matches.service';
import { CreateRoundTripDto } from './dto/create-round-trip.dto';

@Controller('round-trips')
@UseGuards(FirebaseAuthGuard)
export class RoundTripsController {
  constructor(
    private readonly roundTripsService: RoundTripsService,
    private readonly roundTripMatchesService: RoundTripMatchesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoundTripDto,
  ) {
    return this.roundTripsService.create(user.id, dto);
  }

  // Va antes de ':id' para que "matches" no se tome como el id de un paquete
  @Get('matches')
  findMyMatches(@CurrentUser() user: AuthenticatedUser) {
    return this.roundTripMatchesService.findMine(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roundTripsService.findOneOrThrow(id, user.id);
  }

  @Get(':id/matches')
  findMatches(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.roundTripMatchesService.findForPackage(id, user.id);
  }
}
