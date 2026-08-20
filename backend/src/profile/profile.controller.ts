import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Put()
  upsertProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertProfileDto,
  ) {
    return this.profileService.upsertProfile(user.id, dto);
  }
}
