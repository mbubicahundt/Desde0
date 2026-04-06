import { ConfigService } from '@nestjs/config';

export function requiredString(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
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
