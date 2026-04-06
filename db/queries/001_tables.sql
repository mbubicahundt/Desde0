-- 001_tables.sql
-- Core schema (tables + enums)

-- Enums
do $$ begin
  create type public.user_role as enum ('BUYER', 'SELLER');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.car_status as enum ('ACTIVE', 'PAUSED', 'SOLD');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.car_transmission as enum ('MANUAL', 'AUTOMATIC');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.car_fuel as enum ('GASOLINE', 'DIESEL', 'FLEX', 'HYBRID', 'ELECTRIC', 'GNV', 'OTHER');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.car_body_type as enum ('SEDAN', 'COUPE', 'SUV', 'VAN', 'HATCHBACK', 'WAGON', 'PICKUP', 'CROSSOVER', 'OTHER');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.car_condition as enum ('EXCELLENT', 'GOOD', 'REGULAR', 'REPAIR');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.notification_type as enum ('QUESTION_CREATED', 'QUESTION_ANSWERED', 'QUESTION_HIDDEN');
exception
  when duplicate_object then null;
end $$;

-- Tables
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  role public.user_role not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_users_updated_at on public.users;
create trigger tr_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

create table if not exists public.cars (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  brand text not null,
  model text not null,
  year int not null check (year between 1900 and 2100),
  mileage int not null check (mileage >= 0),
  fuel public.car_fuel not null,
  transmission public.car_transmission not null,
  price numeric(12,2) not null check (price >= 0),
  location text not null,
  body_type public.car_body_type not null,
  color text not null,
  owners_count int not null check (owners_count >= 0),
  description text not null,
  status public.car_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_cars_updated_at on public.cars;
create trigger tr_cars_updated_at
before update on public.cars
for each row
execute function public.set_updated_at();

create table if not exists public.car_images (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.car_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null unique references public.cars(id) on delete cascade,
  overall_condition public.car_condition not null,
  damage_summary text,
  price_est_min numeric(12,2),
  price_est_max numeric(12,2),
  currency text not null,
  model_notes text,
  provider text not null default 'GEMINI',
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars(id) on delete cascade,
  buyer_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_questions_updated_at on public.questions;
create trigger tr_questions_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tr_answers_updated_at on public.answers;
create trigger tr_answers_updated_at
before update on public.answers
for each row
execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
