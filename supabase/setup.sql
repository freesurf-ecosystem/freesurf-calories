-- FreeSurf Calorie Tracker — Supabase tables
-- Cloud sync for meal log and goals (optional sign-in)

create table if not exists public.calorie_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null,
  image_url text,
  calories_total integer not null default 0,
  meal_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.calorie_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_goal integer not null default 2000,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.calorie_meals enable row level security;
alter table public.calorie_goals enable row level security;

drop policy if exists "users manage own meals" on public.calorie_meals;
create policy "users manage own meals"
  on public.calorie_meals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage own goals" on public.calorie_goals;
create policy "users manage own goals"
  on public.calorie_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
