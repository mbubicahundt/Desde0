import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import {
  normalizeRequestOrigin,
  resolveAllowedOrigins,
  resolveUploadsDir,
} from './config/runtime-env';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const uploadsDirRaw = resolveUploadsDir(config);
  const uploadsDir = isAbsolute(uploadsDirRaw)
    ? uploadsDirRaw
    : join(process.cwd(), uploadsDirRaw);
  app.use('/uploads', express.static(uploadsDir));

  const allowlist = resolveAllowedOrigins(config);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ): void => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.size === 0) {
        callback(null, true);
        return;
      }
      if (allowlist.has('*')) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeRequestOrigin(origin);
      if (allowlist.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(config.get('PORT') ?? process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
