import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { isAbsolute, join } from 'path';
import { Pool } from 'pg';
import { optionalInt } from '../config/env.util';
import {
  resolveBackendPublicBaseUrl,
  resolveUploadsDir,
} from '../config/runtime-env';
import { PG_POOL } from '../database/database.constants';
import type { ListCarsQuery } from './dto/list-cars.query';
import type { CreateCarDto } from './dto/create-car.dto';
import type { UpdateCarDto } from './dto/update-car.dto';

export type DbCar = {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel: string;
  transmission: string;
  price: string;
  location: string;
  body_type: string;
  color: string;
  owners_count: number;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string | null;
  ai_condition?: string | null;
};

export type DbCarImage = {
  id: string;
  car_id: string;
  storage_path: string;
  public_url: string;
  sort_order: number;
  created_at: string;
};

export type DbCarAiAnalysis = {
  id: string;
  car_id: string;
  overall_condition: string;
  damage_summary: string | null;
  price_est_min: string | null;
  price_est_max: string | null;
  currency: string;
  model_notes: string | null;
  provider: string;
  created_at: string;
};

@Injectable()
export class CarsService {
  private readonly maxImageCount: number;
  private readonly uploadsDir: string;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {
    this.maxImageCount = optionalInt(config, 'MAX_IMAGE_COUNT', 10);

    const uploadsDirRaw = resolveUploadsDir(config);
    this.uploadsDir = isAbsolute(uploadsDirRaw)
      ? uploadsDirRaw
      : join(process.cwd(), uploadsDirRaw);

    this.publicBaseUrl = resolveBackendPublicBaseUrl(config).replace(/\/$/, '');
  }

  private toPublicUrl(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/');
    return `${this.publicBaseUrl}/uploads/${normalized}`;
  }

  async createCar(sellerId: string, dto: CreateCarDto): Promise<DbCar> {
    const result = await this.pool.query<DbCar>(
      `insert into public.cars
       (seller_id, brand, model, year, mileage, fuel, transmission, price, location, body_type, color, owners_count, description)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       returning *`,
      [
        sellerId,
        dto.brand,
        dto.model,
        dto.year,
        dto.mileage,
        dto.fuel,
        dto.transmission,
        dto.price,
        dto.location,
        dto.bodyType,
        dto.color,
        dto.ownersCount,
        dto.description,
      ],
    );
    return result.rows[0];
  }

  async listCars(query: ListCarsQuery) {
    const where: string[] = ["status = 'ACTIVE'"];
    const values: Array<string | number> = [];

    const add = (sql: string, value: string | number) => {
      values.push(value);
      where.push(sql.replace('?', `$${values.length}`));
    };

    if (query.brand) add('brand ilike ?', `%${query.brand}%`);
    if (query.model) add('model ilike ?', `%${query.model}%`);
    if (query.location) add('location ilike ?', `%${query.location}%`);
    if (query.bodyType) add('body_type = ?', query.bodyType);
    if (query.transmission) add('transmission = ?', query.transmission);

    if (query.priceMin !== undefined) add('price >= ?', query.priceMin);
    if (query.priceMax !== undefined) add('price <= ?', query.priceMax);
    if (query.yearMin !== undefined) add('year >= ?', query.yearMin);
    if (query.yearMax !== undefined) add('year <= ?', query.yearMax);
    if (query.mileageMax !== undefined) add('mileage <= ?', query.mileageMax);

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 50);
    const offset = (page - 1) * limit;

    const sql = `
      select
        c.*,
        (
          select i.public_url
          from public.car_images i
          where i.car_id = c.id
          order by i.sort_order asc, i.created_at asc
          limit 1
        ) as thumbnail_url,
        (
          select a.overall_condition
          from public.car_ai_analysis a
          where a.car_id = c.id
          limit 1
        ) as ai_condition
      from public.cars c
      where ${where.join(' and ')}
      order by c.created_at desc
      limit $${values.length + 1} offset $${values.length + 2}
    `;

    const result = await this.pool.query<DbCar>(sql, [
      ...values,
      limit,
      offset,
    ]);

    return {
      page,
      limit,
      items: result.rows,
    };
  }

  async listMyCars(sellerId: string) {
    const res = await this.pool.query<DbCar>(
      `select
        c.*,
        (
          select i.public_url
          from public.car_images i
          where i.car_id = c.id
          order by i.sort_order asc, i.created_at asc
          limit 1
        ) as thumbnail_url,
        (
          select a.overall_condition
          from public.car_ai_analysis a
          where a.car_id = c.id
          limit 1
        ) as ai_condition
       from public.cars c
       where c.seller_id = $1
       order by c.created_at desc`,
      [sellerId],
    );

    return { items: res.rows };
  }

  async getCarById(carId: string) {
    const carRes = await this.pool.query<DbCar>(
      'select * from public.cars where id = $1 limit 1',
      [carId],
    );
    const car = carRes.rows[0];
    if (!car) throw new NotFoundException('Car not found');

    const imagesRes = await this.pool.query<DbCarImage>(
      'select * from public.car_images where car_id = $1 order by sort_order asc, created_at asc',
      [carId],
    );

    const analysisRes = await this.pool.query<DbCarAiAnalysis>(
      'select * from public.car_ai_analysis where car_id = $1 limit 1',
      [carId],
    );

    return {
      ...car,
      images: imagesRes.rows,
      aiAnalysis: analysisRes.rows[0] ?? null,
    };
  }

  async assertSellerOwnsCar(sellerId: string, carId: string): Promise<DbCar> {
    const res = await this.pool.query<DbCar>(
      'select * from public.cars where id = $1 limit 1',
      [carId],
    );
    const car = res.rows[0];
    if (!car) throw new NotFoundException('Car not found');
    if (car.seller_id !== sellerId) {
      throw new ForbiddenException('Not owner of this car');
    }
    return car;
  }

  async updateCar(sellerId: string, carId: string, dto: UpdateCarDto) {
    await this.assertSellerOwnsCar(sellerId, carId);

    const columns: string[] = [];
    const values: any[] = [];

    const set = (col: string, value: any) => {
      values.push(value);
      columns.push(`${col} = $${values.length}`);
    };

    if (dto.brand !== undefined) set('brand', dto.brand);
    if (dto.model !== undefined) set('model', dto.model);
    if (dto.year !== undefined) set('year', dto.year);
    if (dto.mileage !== undefined) set('mileage', dto.mileage);
    if (dto.fuel !== undefined) set('fuel', dto.fuel);
    if (dto.transmission !== undefined) set('transmission', dto.transmission);
    if (dto.price !== undefined) set('price', dto.price);
    if (dto.location !== undefined) set('location', dto.location);
    if (dto.bodyType !== undefined) set('body_type', dto.bodyType);
    if (dto.color !== undefined) set('color', dto.color);
    if (dto.ownersCount !== undefined) set('owners_count', dto.ownersCount);
    if (dto.description !== undefined) set('description', dto.description);

    if (columns.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    values.push(carId);

    const res = await this.pool.query<DbCar>(
      `update public.cars set ${columns.join(', ')} where id = $${values.length} returning *`,
      values,
    );
    return res.rows[0];
  }

  async deleteCar(sellerId: string, carId: string) {
    await this.assertSellerOwnsCar(sellerId, carId);
    await this.pool.query('delete from public.cars where id = $1', [carId]);
    return { ok: true };
  }

  async uploadImages(
    sellerId: string,
    carId: string,
    files: Express.Multer.File[],
  ) {
    await this.assertSellerOwnsCar(sellerId, carId);
    if (!files || files.length === 0) {
      throw new BadRequestException('No images provided');
    }
    if (files.length > this.maxImageCount) {
      throw new BadRequestException(`Max images is ${this.maxImageCount}`);
    }

    const created: DbCarImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = this.guessExt(file.mimetype);
      const relativePath = `cars/${carId}/${randomUUID()}${ext}`;
      const fullPath = join(this.uploadsDir, relativePath);

      await mkdir(join(this.uploadsDir, `cars/${carId}`), { recursive: true });
      await writeFile(fullPath, file.buffer);

      const publicUrl = this.toPublicUrl(relativePath);

      const row = await this.pool.query<DbCarImage>(
        `insert into public.car_images (car_id, storage_path, public_url, sort_order)
         values ($1,$2,$3,$4)
         returning *`,
        [carId, relativePath, publicUrl, i],
      );

      created.push(row.rows[0]);
    }

    return created;
  }

  private guessExt(mime: string) {
    switch (mime) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '.jpg';
    }
  }
}
