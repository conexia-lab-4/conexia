import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { E2eTestingGuard } from './e2e-testing.guard';
import { TestUtilsService } from './test-utils.service';
import { EmailDto } from './dto/email.dto';

@Controller('test-utils')
@UseGuards(E2eTestingGuard)
export class TestUtilsController {
  constructor(private readonly testUtilsService: TestUtilsService) {}

  @Post('verify-email')
  @HttpCode(204)
  verifyEmail(@Body() dto: EmailDto) {
    return this.testUtilsService.verifyEmail(dto.email);
  }

  @Post('reset-profile')
  @HttpCode(204)
  resetProfile(@Body() dto: EmailDto) {
    return this.testUtilsService.resetProfile(dto.email);
  }

  @Post('delete-user')
  @HttpCode(204)
  deleteUser(@Body() dto: EmailDto) {
    return this.testUtilsService.deleteUser(dto.email);
  }
}
