import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { TravelIntentsService } from './travel-intents.service';
import { CreateTravelIntentDto } from './dto/create-travel-intent.dto';

@Controller('travel-intents')
@UseGuards(FirebaseAuthGuard)
export class TravelIntentsController {
  constructor(private readonly travelIntentsService: TravelIntentsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTravelIntentDto,
  ) {
    return this.travelIntentsService.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.travelIntentsService.findMine(user.id);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.travelIntentsService.cancel(id, user.id);
  }
}
