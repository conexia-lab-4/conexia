import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { UniversitiesService } from './universities.service';

@Controller('universities')
@UseGuards(FirebaseAuthGuard)
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  findAll() {
    return this.universitiesService.findAll();
  }

  @Get(':id/campuses')
  findCampuses(@Param('id') id: string) {
    return this.universitiesService.findCampuses(id);
  }
}
