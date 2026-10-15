import { Controller, Param, Post, UseGuards, Get } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { TravelMatchesService } from './travel-matches.service';

@Controller('travel-matches')
@UseGuards(FirebaseAuthGuard)
export class TravelMatchesController {
  constructor(private readonly travelMatchesService: TravelMatchesService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.travelMatchesService.findMine(user.id);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.travelMatchesService.accept(id, user.id);
  }

  @Post(':id/reject')
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.travelMatchesService.reject(id, user.id);
  }
}
