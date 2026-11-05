import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TestUtilsController } from './test-utils.controller';
import { TestUtilsService } from './test-utils.service';

@Module({
  imports: [NotificationsModule],
  controllers: [TestUtilsController],
  providers: [TestUtilsService],
})
export class TestUtilsModule {}
