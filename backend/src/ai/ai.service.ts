import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pool } from 'pg';
import { readFile } from 'fs/promises';
import { isAbsolute, join } from 'path';
import { optionalInt } from '../config/env.util';
import { PG_POOL } from '../database/database.constants';
import type { DbCarAiAnalysis, DbCarImage } from '../cars/cars.service';

type GeminiAnalysis = {
  overall_condition: 'EXCELLENT' | 'GOOD' | 'REGULAR' | 'REPAIR';
  damage_summary: string;
  price_est_min: number | null;
  price_est_max: number | null;
  currency: string;
  model_notes?: string;
};

type GeminiAnalysisJson = {
  overall_condition?: unknown;
  damage_summary?: unknown;
  price_est_min?: unknown;
  price_est_max?: unknown;
  currency?: unknown;
  model_notes?: unknown;
};

@Injectable()
export class AiService {
  private readonly gemini?: GoogleGenerativeAI;
  private readonly modelName: string;
  private readonly currency: string;
  private readonly maxImages: number;
  private readonly uploadsDir: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.gemini = apiKey ? new GoogleGenerativeAI(apiKey) : undefined;
    this.modelName = config.get('GEMINI_MODEL') ?? 'gemini-1.5-flash';
    this.currency = config.get('DEFAULT_CURRENCY') ?? 'USD';
    this.maxImages = optionalInt(config, 'AI_MAX_IMAGES', 3);

    const uploadsDirRaw = config.get<string>('UPLOADS_DIR') ?? 'uploads';
    this.uploadsDir = isAbsolute(uploadsDirRaw)
      ? uploadsDirRaw
      : join(process.cwd(), uploadsDirRaw);
  }

  async analyzeCar(carId: string): Promise<DbCarAiAnalysis> {
    if (!this.gemini) {
      throw new BadRequestException('GEMINI_API_KEY is not configured');
    }
    const imagesRes = await this.pool.query<DbCarImage>(
      'select * from public.car_images where car_id = $1 order by sort_order asc, created_at asc',
      [carId],
    );

    const images = imagesRes.rows.slice(0, this.maxImages);
    if (images.length === 0) {
      throw new BadRequestException('No images available for analysis');
    }

    const imageParts: Array<{
      inlineData: { data: string; mimeType: string };
    }> = [];
    for (const img of images) {
      const { base64, mimeType } = await this.loadImageAsBase64(img);
      imageParts.push({ inlineData: { data: base64, mimeType } });
    }

    const prompt = this.buildPrompt();

    const model = this.gemini.getGenerativeModel({ model: this.modelName });
    const response = await model.generateContent([prompt, ...imageParts]);
    const text = response.response.text();

    const parsed = this.parseJson(text);

    const normalized: GeminiAnalysis = {
      overall_condition: this.normalizeCondition(parsed.overall_condition),
      damage_summary:
        typeof parsed.damage_summary === 'string' ? parsed.damage_summary : '',
      price_est_min:
        parsed.price_est_min === null || parsed.price_est_min === undefined
          ? null
          : Number(parsed.price_est_min),
      price_est_max:
        parsed.price_est_max === null || parsed.price_est_max === undefined
          ? null
          : Number(parsed.price_est_max),
      currency:
        typeof parsed.currency === 'string' ? parsed.currency : this.currency,
      model_notes:
        parsed.model_notes === undefined
          ? undefined
          : typeof parsed.model_notes === 'string'
            ? parsed.model_notes
            : undefined,
    };

    const upsert = await this.pool.query<DbCarAiAnalysis>(
      `insert into public.car_ai_analysis
        (car_id, overall_condition, damage_summary, price_est_min, price_est_max, currency, model_notes, provider)
       values ($1,$2,$3,$4,$5,$6,$7,'GEMINI')
       on conflict (car_id)
       do update set
        overall_condition = excluded.overall_condition,
        damage_summary = excluded.damage_summary,
        price_est_min = excluded.price_est_min,
        price_est_max = excluded.price_est_max,
        currency = excluded.currency,
        model_notes = excluded.model_notes,
        provider = excluded.provider,
        created_at = now()
       returning *`,
      [
        carId,
        normalized.overall_condition,
        normalized.damage_summary,
        normalized.price_est_min,
        normalized.price_est_max,
        normalized.currency,
        normalized.model_notes ?? null,
      ],
    );

    const row = upsert.rows[0];
    if (!row) {
      throw new BadRequestException('AI analysis could not be saved');
    }
    return row;
  }

  private buildPrompt() {
    return `You are analyzing photos of a used car listing.
Return ONLY a valid JSON object with these exact keys:
{
  "overall_condition": "EXCELLENT" | "GOOD" | "REGULAR" | "REPAIR",
  "damage_summary": string,
  "price_est_min": number | null,
  "price_est_max": number | null,
  "currency": string,
  "model_notes": string
}
Guidelines:
- Be conservative; if unsure, use REGULAR.
- Mention visible damages (dents, scratches, broken lights, misalignment, rust).
- price_est_* should be a reasonable market range guess. Use currency ${this.currency}.
- No markdown, no extra text, JSON only.`;
  }

  private normalizeCondition(
    value: unknown,
  ): GeminiAnalysis['overall_condition'] {
    const v = (typeof value === 'string' ? value : '').toUpperCase().trim();
    if (v === 'EXCELLENT') return 'EXCELLENT';
    if (v === 'GOOD') return 'GOOD';
    if (v === 'REPAIR' || v === 'REQUIRES_REPAIR') return 'REPAIR';
    return 'REGULAR';
  }

  private parseJson(text: string): GeminiAnalysisJson {
    const trimmed = text.trim();
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return this.coerceGeminiJson(parsed);
    } catch {
      // try to extract first JSON object
      const firstBrace = trimmed.indexOf('{');
      const lastBrace = trimmed.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const chunk = trimmed.slice(firstBrace, lastBrace + 1);
        try {
          const parsed: unknown = JSON.parse(chunk);
          return this.coerceGeminiJson(parsed);
        } catch {
          // fallthrough
        }
      }
      throw new BadRequestException('AI response was not valid JSON');
    }
  }

  private coerceGeminiJson(value: unknown): GeminiAnalysisJson {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException('AI response JSON was not an object');
    }

    const record = value as Record<string, unknown>;
    return {
      overall_condition: record.overall_condition,
      damage_summary: record.damage_summary,
      price_est_min: record.price_est_min,
      price_est_max: record.price_est_max,
      currency: record.currency,
      model_notes: record.model_notes,
    };
  }

  private async fetchAsBase64(
    url: string,
  ): Promise<{ base64: string; mimeType: string }> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new BadRequestException(
        `Failed to fetch image for AI: ${res.status}`,
      );
    }
    const mimeType = res.headers.get('content-type') ?? 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return {
      base64: buffer.toString('base64'),
      mimeType,
    };
  }

  private async loadImageAsBase64(
    img: DbCarImage,
  ): Promise<{ base64: string; mimeType: string }> {
    if (img.storage_path) {
      try {
        const fullPath = join(this.uploadsDir, img.storage_path);
        const buffer = await readFile(fullPath);
        return {
          base64: buffer.toString('base64'),
          mimeType: this.mimeFromPath(img.storage_path),
        };
      } catch {
        // fallback to public_url
      }
    }

    return this.fetchAsBase64(img.public_url);
  }

  private mimeFromPath(path: string): string {
    const lower = path.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/jpeg';
  }
}
