import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TestUtilsModule } from './test-utils/test-utils.module';
import { TravelIntentsModule } from './travel-intents/travel-intents.module';
import { TripsModule } from './trips/trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    PrismaModule,
    ProfileModule,
    SubjectsModule,
    TripsModule,
    TravelIntentsModule,
    TestUtilsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
