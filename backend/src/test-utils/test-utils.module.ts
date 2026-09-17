import { Module } from '@nestjs/common';
import { TestUtilsController } from './test-utils.controller';
import { TestUtilsService } from './test-utils.service';

@Module({
  controllers: [TestUtilsController],
  providers: [TestUtilsService],
})
export class TestUtilsModule {}
