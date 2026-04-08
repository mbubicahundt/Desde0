import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { resolveDatabaseSsl, resolveDatabaseUrl } from '../config/runtime-env';
import { PG_POOL } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = resolveDatabaseUrl(config);
        const useSsl = resolveDatabaseSsl(config);

        return new Pool({
          connectionString,
          ssl: useSsl ? { rejectUnauthorized: false } : undefined,
          max: 10,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
