import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { Pool } from 'pg';
import { optionalBool } from '../config/env.util';
import { resolveDatabaseSsl, resolveDatabaseUrl } from '../config/runtime-env';
import { PG_POOL } from './database.constants';

const SCHEMA_FILES = [
  '000_extensions.sql',
  '001_tables.sql',
  '002_indexes.sql',
];
const SEED_FILE = '010_seed_dev.sql';

function resolveQueriesDir(explicitDir?: string): string[] {
  if (explicitDir) {
    const dir = isAbsolute(explicitDir)
      ? explicitDir
      : resolve(process.cwd(), explicitDir);
    return [dir];
  }

  return [
    resolve(process.cwd(), '..', 'db', 'queries'),
    resolve(process.cwd(), 'db', 'queries'),
    resolve(__dirname, '..', '..', '..', 'db', 'queries'),
  ];
}

async function runSqlFile(pool: Pool, filePath: string): Promise<void> {
  const sql = await readFile(filePath, 'utf8');
  if (!sql.trim()) return;
  await pool.query(sql);
}

async function schemaExists(pool: Pool): Promise<boolean> {
  const res = await pool.query<{ exists: string | null }>(
    "select to_regclass('public.users') as exists",
  );
  return Boolean(res.rows[0]?.exists);
}

async function initializeSchemaIfNeeded(
  pool: Pool,
  queriesDirCandidates: string[],
  autoSeed: boolean,
): Promise<void> {
  const exists = await schemaExists(pool);
  if (exists) return;

  let selectedDir: string | null = null;
  for (const dir of queriesDirCandidates) {
    try {
      await readFile(join(dir, '001_tables.sql'), 'utf8');
      selectedDir = dir;
      break;
    } catch {
      // Continue to next candidate.
    }
  }

  if (!selectedDir) {
    throw new Error(
      `Database schema is missing and queries directory was not found. Checked: ${queriesDirCandidates.join(', ')}`,
    );
  }

  for (const file of SCHEMA_FILES) {
    await runSqlFile(pool, join(selectedDir, file));
  }

  if (autoSeed) {
    try {
      await runSqlFile(pool, join(selectedDir, SEED_FILE));
    } catch {
      // Seed is optional.
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const connectionString = resolveDatabaseUrl(config);
        const useSsl = resolveDatabaseSsl(config);
        const queriesDir = config.get<string>('DB_QUERIES_DIR') ?? undefined;
        const autoSeed = optionalBool(config, 'DB_AUTO_SEED', false);

        const pool = new Pool({
          connectionString,
          ssl: useSsl ? { rejectUnauthorized: false } : undefined,
          max: 10,
        });

        await pool.query('select 1');
        await initializeSchemaIfNeeded(
          pool,
          resolveQueriesDir(queriesDir),
          autoSeed,
        );

        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
