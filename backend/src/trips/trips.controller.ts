import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Controller('trips')
@UseGuards(FirebaseAuthGuard)
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.id, dto);
  }

  @Get()
  findUpcoming(@CurrentUser() user: AuthenticatedUser) {
    return this.tripsService.findUpcoming(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.findOneOrThrow(id, user.id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(id, user.id, dto);
  }

  @Post(':id/passengers')
  @HttpCode(HttpStatus.CREATED)
  join(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.join(id, user.id);
  }

  @Delete(':id/passengers')
  @HttpCode(HttpStatus.NO_CONTENT)
  leave(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tripsService.leave(id, user.id);
  }
}
