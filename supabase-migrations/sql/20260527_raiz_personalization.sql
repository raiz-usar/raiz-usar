create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.raiz_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  age_range text,
  gender_identity text,
  hair_type text not null,
  is_transitioning boolean not null default false,
  texture text not null,
  porosity text not null,
  density text not null,
  volume_perception text,
  current_length text,
  scalp_oiliness text not null,
  wash_frequency text not null,
  care_frequency text not null,
  time_available text,
  routine_preference text,
  consistency_feeling text,
  blow_dryer_frequency text not null default 'nunca',
  flat_iron_frequency text not null default 'nunca',
  nighttime_habits text[] not null default '{}',
  sleeps_with_bonnet boolean not null default false,
  uses_hair_protection boolean not null default false,
  protective_styles text[] not null default '{}',
  protective_style_duration text,
  washes_while_protective_style boolean,
  chemical_processes text[] not null default '{}',
  current_goals text[] not null default '{}',
  desired_day_to_day_results text[] not null default '{}',
  main_challenges text[] not null default '{}',
  recurring_symptoms text[] not null default '{}',
  region_climate text not null,
  city_or_region text,
  climate_impacts_hair boolean,
  feelings_about_hair text[] not null default '{}',
  hair_knowledge_level text,
  notes text,
  reminders_enabled boolean not null default true,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.raiz_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  brand text,
  purpose text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists raiz_products_user_name_idx
  on public.raiz_products (user_id, lower(name));

create table if not exists public.raiz_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null default current_date,
  humidity integer not null default 60,
  temperature integer not null default 24,
  selected_symptoms text[] not null default '{}',
  completed_steps jsonb not null default '[]'::jsonb,
  selected_product_ids uuid[] not null default '{}',
  selected_habits text[] not null default '{}',
  daily_note text not null default '',
  photo_logged boolean not null default false,
  hydration_score integer not null default 50,
  strength_score integer not null default 50,
  definition_score integer not null default 50,
  ends_score integer not null default 50,
  overall_score integer not null default 50,
  summary_title text not null default '',
  summary_description text not null default '',
  focus_label text not null default '',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint raiz_checkins_user_date_unique unique (user_id, checkin_date),
  constraint raiz_checkins_humidity_range check (humidity between 0 and 100),
  constraint raiz_checkins_temperature_range check (temperature between -10 and 60),
  constraint raiz_checkins_hydration_range check (hydration_score between 0 and 100),
  constraint raiz_checkins_strength_range check (strength_score between 0 and 100),
  constraint raiz_checkins_definition_range check (definition_score between 0 and 100),
  constraint raiz_checkins_ends_range check (ends_score between 0 and 100),
  constraint raiz_checkins_overall_range check (overall_score between 0 and 100)
);

drop trigger if exists raiz_profiles_updated_at on public.raiz_profiles;
create trigger raiz_profiles_updated_at
before update on public.raiz_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists raiz_products_updated_at on public.raiz_products;
create trigger raiz_products_updated_at
before update on public.raiz_products
for each row
execute function public.set_updated_at();

drop trigger if exists raiz_checkins_updated_at on public.raiz_checkins;
create trigger raiz_checkins_updated_at
before update on public.raiz_checkins
for each row
execute function public.set_updated_at();

alter table public.raiz_profiles enable row level security;
alter table public.raiz_products enable row level security;
alter table public.raiz_checkins enable row level security;

drop policy if exists "raiz_profiles_select_own" on public.raiz_profiles;
create policy "raiz_profiles_select_own"
on public.raiz_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "raiz_profiles_insert_own" on public.raiz_profiles;
create policy "raiz_profiles_insert_own"
on public.raiz_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "raiz_profiles_update_own" on public.raiz_profiles;
create policy "raiz_profiles_update_own"
on public.raiz_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "raiz_products_select_own" on public.raiz_products;
create policy "raiz_products_select_own"
on public.raiz_products
for select
using (auth.uid() = user_id);

drop policy if exists "raiz_products_insert_own" on public.raiz_products;
create policy "raiz_products_insert_own"
on public.raiz_products
for insert
with check (auth.uid() = user_id);

drop policy if exists "raiz_products_update_own" on public.raiz_products;
create policy "raiz_products_update_own"
on public.raiz_products
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "raiz_products_delete_own" on public.raiz_products;
create policy "raiz_products_delete_own"
on public.raiz_products
for delete
using (auth.uid() = user_id);

drop policy if exists "raiz_checkins_select_own" on public.raiz_checkins;
create policy "raiz_checkins_select_own"
on public.raiz_checkins
for select
using (auth.uid() = user_id);

drop policy if exists "raiz_checkins_insert_own" on public.raiz_checkins;
create policy "raiz_checkins_insert_own"
on public.raiz_checkins
for insert
with check (auth.uid() = user_id);

drop policy if exists "raiz_checkins_update_own" on public.raiz_checkins;
create policy "raiz_checkins_update_own"
on public.raiz_checkins
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "raiz_checkins_delete_own" on public.raiz_checkins;
create policy "raiz_checkins_delete_own"
on public.raiz_checkins
for delete
using (auth.uid() = user_id);
