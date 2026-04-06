-- 002_indexes.sql
-- Indexes to support filters, Q&A, notifications

create index if not exists idx_cars_brand on public.cars (brand);
create index if not exists idx_cars_model on public.cars (model);
create index if not exists idx_cars_year on public.cars (year);
create index if not exists idx_cars_price on public.cars (price);
create index if not exists idx_cars_mileage on public.cars (mileage);
create index if not exists idx_cars_location on public.cars (location);
create index if not exists idx_cars_status on public.cars (status);
create index if not exists idx_cars_seller_id on public.cars (seller_id);

create index if not exists idx_car_images_car_id_sort on public.car_images (car_id, sort_order);

create index if not exists idx_questions_car_created_at on public.questions (car_id, created_at desc);
create index if not exists idx_questions_buyer_id on public.questions (buyer_id);

create index if not exists idx_notifications_user_unread on public.notifications (user_id, is_read);
create index if not exists idx_notifications_user_created_at on public.notifications (user_id, created_at desc);
