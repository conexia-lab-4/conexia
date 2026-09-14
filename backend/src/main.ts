import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const PROD_ORIGIN = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/conexia-[a-z0-9-]+-martinogueiras-projects\.vercel\.app$/;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        origin === PROD_ORIGIN ||
        VERCEL_PREVIEW_ORIGIN.test(origin)
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => {
  console.error('Error al iniciar la app:', err);
  process.exit(1);
});