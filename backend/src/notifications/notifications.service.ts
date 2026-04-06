import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';

export type DbNotification = {
  id: string;
  user_id: string;
  type: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

@Injectable()
export class NotificationsService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(params: {
    userId: string;
    type: 'QUESTION_CREATED' | 'QUESTION_ANSWERED' | 'QUESTION_HIDDEN';
    entityId?: string | null;
  }) {
    const res = await this.pool.query<DbNotification>(
      `insert into public.notifications (user_id, type, entity_id)
       values ($1,$2,$3)
       returning *`,
      [params.userId, params.type, params.entityId ?? null],
    );
    return res.rows[0];
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 50);
    const offset = (page - 1) * safeLimit;

    const res = await this.pool.query<DbNotification>(
      `select * from public.notifications
       where user_id = $1
       order by created_at desc
       limit $2 offset $3`,
      [userId, safeLimit, offset],
    );

    return {
      page,
      limit: safeLimit,
      items: res.rows,
    };
  }

  async unreadCount(userId: string) {
    const res = await this.pool.query<{ count: string }>(
      `select count(*)::text as count
       from public.notifications
       where user_id = $1 and is_read = false`,
      [userId],
    );
    return { unread: Number(res.rows[0]?.count ?? 0) };
  }

  async markRead(userId: string, notificationId: string) {
    const res = await this.pool.query<DbNotification>(
      `update public.notifications
       set is_read = true
       where id = $1 and user_id = $2
       returning *`,
      [notificationId, userId],
    );
    return res.rows[0] ?? null;
  }
}
