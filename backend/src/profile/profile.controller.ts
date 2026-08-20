import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() request: Request & { user: { id: string } }) {
    return this.profileService.getProfile(request.user.id);
  }

  @Put()
  upsertProfile(
    @Req() request: Request & { user: { id: string } },
    @Body() dto: UpsertProfileDto,
  ) {
    return this.profileService.upsertProfile(request.user.id, dto);
  }
}
