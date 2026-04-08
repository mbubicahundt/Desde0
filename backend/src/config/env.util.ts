import { ConfigService } from '@nestjs/config';

export function requiredString(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export function requiredStringAny(
  config: ConfigService,
  keys: string[],
): string {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value) return value;
  }
  throw new Error(`Missing required env var (any of): ${keys.join(', ')}`);
}

export function optionalStringAny(
  config: ConfigService,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = config.get<string>(key);
    if (value) return value;
  }
  return undefined;
}

export function optionalBoolAny(
  config: ConfigService,
  keys: string[],
  defaultValue: boolean,
): boolean {
  const raw = optionalStringAny(config, keys);
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

export function optionalBool(
  config: ConfigService,
  key: string,
  defaultValue: boolean,
): boolean {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
}

export function optionalInt(
  config: ConfigService,
  key: string,
  defaultValue: number,
): number {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === null || raw === '') return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return defaultValue;
  return parsed;
}
