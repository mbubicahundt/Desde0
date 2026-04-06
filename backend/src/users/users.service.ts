import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import type { UserRole } from '../common/request-user';

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class UsersService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<DbUser | null> {
    const result = await this.pool.query<DbUser>(
      'select * from public.users where email = $1 limit 1',
      [email.toLowerCase()],
    );
    return result.rows[0] ?? null;
  }

  async findById(userId: string): Promise<DbUser> {
    const result = await this.pool.query<DbUser>(
      'select * from public.users where id = $1 limit 1',
      [userId],
    );
    const user = result.rows[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(params: {
    email: string;
    passwordHash: string;
    role: UserRole;
    name: string | null;
  }): Promise<DbUser> {
    const result = await this.pool.query<DbUser>(
      `insert into public.users (email, password_hash, role, name)
       values ($1, $2, $3, $4)
       returning *`,
      [
        params.email.toLowerCase(),
        params.passwordHash,
        params.role,
        params.name,
      ],
    );
    return result.rows[0];
  }
}
