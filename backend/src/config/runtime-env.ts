import { ConfigService } from '@nestjs/config';
import { optionalBoolAny, requiredString, requiredStringAny } from './env.util';

function cleanEnvValue(raw: string): string {
  let value = raw.trim();
  value = value.replace(/^['"`]+|['"`]+$/g, '');
  value = value.replace(/[;,]+$/g, '');
  return value.trim();
}

function normalizeHttpUrl(raw: string): string {
  const cleaned = cleanEnvValue(raw).replace(/\/$/, '');
  if (!cleaned) return '';

  let candidate = cleaned;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(candidate)) {
      candidate = `http://${candidate}`;
    } else {
      candidate = `https://${candidate}`;
    }
  }

  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return candidate.replace(/\/$/, '');
  }
}

function normalizeOrigin(raw: string): string {
  const cleaned = cleanEnvValue(raw);
  if (!cleaned) return '';
  if (cleaned === '*') return '*';

  const normalizedUrl = normalizeHttpUrl(cleaned);
  try {
    return new URL(normalizedUrl).origin.toLowerCase();
  } catch {
    return normalizedUrl.toLowerCase().replace(/\/$/, '');
  }
}

function readValues(config: ConfigService, keys: string[]): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const raw = config.get<string>(key);
    if (!raw) continue;
    const chunks = raw
      .split(',')
      .map((v) => cleanEnvValue(v))
      .filter(Boolean);
    values.push(...chunks);
  }
  return values;
}

export function resolveDatabaseUrl(config: ConfigService): string {
  return requiredString(config, 'DATABASE_URL');
}

export function resolveDatabaseSsl(config: ConfigService): boolean {
  return optionalBoolAny(config, ['DATABASE_SSL', 'DB_SSL'], true);
}

export function resolveJwtSecret(config: ConfigService): string {
  return requiredStringAny(config, ['JWT_SECRET', 'JWT_SECRET_PASSWORD']);
}

export function resolveUploadsDir(config: ConfigService): string {
  const raw = config.get<string>('UPLOADS_DIR');
  return cleanEnvValue(raw ?? 'uploads') || 'uploads';
}

export function resolveBackendPublicBaseUrl(config: ConfigService): string {
  // Priority intentionally supports both naming conventions:
  // - canonical backend URL vars first
  // - then legacy aliases used during Railway setup
  const raw = requiredStringAny(config, [
    'PUBLIC_BASE_URL',
    'BACKEND_PUBLIC_URL',
    'BACKEND_URL',
    'CORS_URL',
    'APP_URL',
  ]);

  return normalizeHttpUrl(raw);
}

export function resolveAllowedOrigins(config: ConfigService): Set<string> {
  const values = readValues(config, [
    'CORS_ORIGINS',
    'FRONTEND_ORIGINS',
    'FRONTEND_URL',
    'APP_URL',
    'CORS_URL',
  ]);

  const allowlist = new Set<string>();
  for (const value of values) {
    const normalized = normalizeOrigin(value);
    if (normalized) allowlist.add(normalized);
  }
  return allowlist;
}

export function normalizeRequestOrigin(origin: string): string {
  return normalizeOrigin(origin);
}
