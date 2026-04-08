import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import helmet from 'helmet';
import { isAbsolute, join } from 'path';
import { AppModule } from './app.module';

function normalizeOrigin(raw: string): string {
  let trimmed = raw.trim();
  // Tolerate env values wrapped in quotes/backticks from dashboards/copy-paste.
  trimmed = trimmed.replace(/^['"`]+|['"`]+$/g, '');
  trimmed = trimmed.replace(/[;,]+$/g, '');
  trimmed = trimmed.replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed === '*') return '*';

  // If user provided a full URL (including path/query), keep only its origin.
  try {
    const url = new URL(trimmed);
    return url.origin.toLowerCase();
  } catch {
    // Ignore parse errors and continue with fallback normalization.
  }

  // Accept values like frontend.example.com/path by forcing URL parsing.
  if (!/^https?:\/\//i.test(trimmed) && /^[^\s]+\.[^\s]+/.test(trimmed)) {
    try {
      const url = new URL(`https://${trimmed}`);
      return url.origin.toLowerCase();
    } catch {
      // Fallback below
    }
  }

  if (/^https?:\/\//i.test(trimmed)) return trimmed.toLowerCase();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed.toLowerCase()}`;
  }
  return `https://${trimmed.toLowerCase()}`;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const uploadsDirRaw = config.get<string>('UPLOADS_DIR') ?? 'uploads';
  const uploadsDir = isAbsolute(uploadsDirRaw)
    ? uploadsDirRaw
    : join(process.cwd(), uploadsDirRaw);
  app.use('/uploads', express.static(uploadsDir));

  const corsOriginsRaw =
    config.get<string>('CORS_ORIGINS') ?? config.get<string>('CORS_URL') ?? '';
  const allowlist = new Set(
    corsOriginsRaw
      .split(',')
      .map((o) => normalizeOrigin(o))
      .filter(Boolean),
  );

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
      const normalizedOrigin = normalizeOrigin(origin);
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
