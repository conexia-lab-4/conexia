import { Controller, Get, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { UniversitiesService } from './universities.service';

@Controller('campuses')
@UseGuards(FirebaseAuthGuard)
export class CampusesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  findAll() {
    return this.universitiesService.findAllCampuses();
  }
}
