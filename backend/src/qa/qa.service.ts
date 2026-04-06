import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.constants';
import { NotificationsService } from '../notifications/notifications.service';

export type DbQuestion = {
  id: string;
  car_id: string;
  buyer_id: string;
  text: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
};

export type DbAnswer = {
  id: string;
  question_id: string;
  seller_id: string;
  text: string;
  created_at: string;
  updated_at: string;
};

@Injectable()
export class QaService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly notifications: NotificationsService,
  ) {}

  async listPublicQuestions(carId: string) {
    const res = await this.pool.query<
      DbQuestion & {
        answer_id: string | null;
        answer_text: string | null;
        answer_created_at: string | null;
      }
    >(
      `select q.*, a.id as answer_id, a.text as answer_text, a.created_at as answer_created_at
       from public.questions q
       left join public.answers a on a.question_id = q.id
       where q.car_id = $1 and q.is_hidden = false
       order by q.created_at desc`,
      [carId],
    );

    return res.rows.map((r) => ({
      id: r.id,
      carId: r.car_id,
      buyerId: r.buyer_id,
      text: r.text,
      createdAt: r.created_at,
      answer: r.answer_id
        ? {
            id: r.answer_id,
            text: r.answer_text ?? '',
            createdAt: r.answer_created_at ?? r.created_at,
          }
        : null,
    }));
  }

  async createQuestion(carId: string, buyerId: string, text: string) {
    const sellerRes = await this.pool.query<{ seller_id: string }>(
      'select seller_id from public.cars where id = $1 limit 1',
      [carId],
    );
    const sellerId = sellerRes.rows[0]?.seller_id;
    if (!sellerId) throw new NotFoundException('Car not found');

    const res = await this.pool.query<DbQuestion>(
      `insert into public.questions (car_id, buyer_id, text)
       values ($1,$2,$3)
       returning *`,
      [carId, buyerId, text],
    );

    await this.notifications.create({
      userId: sellerId,
      type: 'QUESTION_CREATED',
      entityId: res.rows[0].id,
    });

    return res.rows[0];
  }

  async answerQuestion(questionId: string, sellerId: string, text: string) {
    const qRes = await this.pool.query<{
      id: string;
      car_id: string;
      buyer_id: string;
    }>(
      'select id, car_id, buyer_id from public.questions where id = $1 limit 1',
      [questionId],
    );
    const q = qRes.rows[0];
    if (!q) throw new NotFoundException('Question not found');

    const ownerRes = await this.pool.query<{ seller_id: string }>(
      'select seller_id from public.cars where id = $1 limit 1',
      [q.car_id],
    );
    const ownerId = ownerRes.rows[0]?.seller_id;
    if (!ownerId) throw new NotFoundException('Car not found');
    if (ownerId !== sellerId) {
      throw new ForbiddenException('Not owner of this car');
    }

    const res = await this.pool.query<DbAnswer>(
      `insert into public.answers (question_id, seller_id, text)
       values ($1,$2,$3)
       on conflict (question_id)
       do update set text = excluded.text, updated_at = now()
       returning *`,
      [questionId, sellerId, text],
    );

    await this.notifications.create({
      userId: q.buyer_id,
      type: 'QUESTION_ANSWERED',
      entityId: questionId,
    });

    return res.rows[0];
  }

  async hideQuestion(questionId: string, sellerId: string) {
    const qRes = await this.pool.query<{
      id: string;
      car_id: string;
      buyer_id: string;
    }>(
      'select id, car_id, buyer_id from public.questions where id = $1 limit 1',
      [questionId],
    );
    const q = qRes.rows[0];
    if (!q) throw new NotFoundException('Question not found');

    const ownerRes = await this.pool.query<{ seller_id: string }>(
      'select seller_id from public.cars where id = $1 limit 1',
      [q.car_id],
    );
    const ownerId = ownerRes.rows[0]?.seller_id;
    if (!ownerId) throw new NotFoundException('Car not found');
    if (ownerId !== sellerId) {
      throw new ForbiddenException('Not owner of this car');
    }

    const res = await this.pool.query<DbQuestion>(
      `update public.questions set is_hidden = true where id = $1 returning *`,
      [questionId],
    );

    await this.notifications.create({
      userId: q.buyer_id,
      type: 'QUESTION_HIDDEN',
      entityId: questionId,
    });

    return res.rows[0];
  }
}
