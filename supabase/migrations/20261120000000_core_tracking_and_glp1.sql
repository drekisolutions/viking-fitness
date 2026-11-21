-- Viking Fitness — Core Tracking + GLP-1 Muscle Armor Tables
-- Idempotent migration (safe on fresh or existing DBs).
-- Every table enables Row Level Security scoped strictly to auth.uid() = user_id
-- and cascades cleanly on auth.users deletion.

-- 1. Food Logs ----------------------------------------------------------------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  meal_slot text not null,
  name text not null,
  brand text,
  portion text,
  calories int not null default 0,
  protein numeric(6,1) not null default 0,
  carbs numeric(6,1) not null default 0,
  fat numeric(6,1) not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, log_date desc);

alter table public.food_logs enable row level security;

drop policy if exists "food_logs_select_own" on public.food_logs;
create policy "food_logs_select_own"
  on public.food_logs for select
  using (auth.uid() = user_id);

drop policy if exists "food_logs_insert_own" on public.food_logs;
create policy "food_logs_insert_own"
  on public.food_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "food_logs_update_own" on public.food_logs;
create policy "food_logs_update_own"
  on public.food_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "food_logs_delete_own" on public.food_logs;
create policy "food_logs_delete_own"
  on public.food_logs for delete
  using (auth.uid() = user_id);

-- 2. Water & Electrolyte Logs -------------------------------------------------
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  glasses int not null default 0,
  electrolytes_taken boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.water_logs enable row level security;

drop policy if exists "water_logs_select_own" on public.water_logs;
create policy "water_logs_select_own"
  on public.water_logs for select
  using (auth.uid() = user_id);

drop policy if exists "water_logs_insert_own" on public.water_logs;
create policy "water_logs_insert_own"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "water_logs_update_own" on public.water_logs;
create policy "water_logs_update_own"
  on public.water_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "water_logs_delete_own" on public.water_logs;
create policy "water_logs_delete_own"
  on public.water_logs for delete
  using (auth.uid() = user_id);

-- 3. Weight & Body Measurement Logs -------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  weight_lbs numeric(6,2) not null,
  body_fat_pct numeric(4,1),
  waist_in numeric(5,2),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists weight_logs_user_date_idx
  on public.weight_logs (user_id, log_date desc);

alter table public.weight_logs enable row level security;

drop policy if exists "weight_logs_select_own" on public.weight_logs;
create policy "weight_logs_select_own"
  on public.weight_logs for select
  using (auth.uid() = user_id);

drop policy if exists "weight_logs_insert_own" on public.weight_logs;
create policy "weight_logs_insert_own"
  on public.weight_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "weight_logs_update_own" on public.weight_logs;
create policy "weight_logs_update_own"
  on public.weight_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "weight_logs_delete_own" on public.weight_logs;
create policy "weight_logs_delete_own"
  on public.weight_logs for delete
  using (auth.uid() = user_id);

-- 4. Workout Sessions ---------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  split text not null,
  name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  duration_min int not null default 0,
  total_volume_lbs numeric(10,1) not null default 0,
  glp1_phase text,
  notes text
);

create index if not exists workout_sessions_user_completed_idx
  on public.workout_sessions (user_id, completed_at desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own"
  on public.workout_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_delete_own" on public.workout_sessions;
create policy "workout_sessions_delete_own"
  on public.workout_sessions for delete
  using (auth.uid() = user_id);

-- 5. Workout Sets -------------------------------------------------------------
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_name text not null,
  muscle_group text not null,
  set_number int not null,
  weight_lbs numeric(6,1) not null default 0,
  reps int not null default 0,
  estimated_1rm numeric(6,1) not null default 0,
  is_pr boolean not null default false,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_session_idx
  on public.workout_sets (session_id);

alter table public.workout_sets enable row level security;

drop policy if exists "workout_sets_select_own" on public.workout_sets;
create policy "workout_sets_select_own"
  on public.workout_sets for select
  using (auth.uid() = user_id);

drop policy if exists "workout_sets_insert_own" on public.workout_sets;
create policy "workout_sets_insert_own"
  on public.workout_sets for insert
  with check (auth.uid() = user_id);

drop policy if exists "workout_sets_update_own" on public.workout_sets;
create policy "workout_sets_update_own"
  on public.workout_sets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_sets_delete_own" on public.workout_sets;
create policy "workout_sets_delete_own"
  on public.workout_sets for delete
  using (auth.uid() = user_id);

-- 6. GLP-1 Companion Profiles -------------------------------------------------
create table if not exists public.glp1_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  medication text not null default 'semaglutide',
  brand_name text not null default 'Ozempic / Wegovy',
  current_dose_mg numeric(5,2) not null default 0.50,
  shot_interval_days int not null default 7,
  phase_mode text not null default 'active' check (phase_mode in ('active', 'tapering', 'maintenance')),
  reverse_diet_start_date date,
  reverse_diet_weekly_bump_kcal int not null default 75,
  protein_floor_g int not null default 120,
  updated_at timestamptz not null default now()
);

alter table public.glp1_profiles enable row level security;

drop policy if exists "glp1_profiles_select_own" on public.glp1_profiles;
create policy "glp1_profiles_select_own"
  on public.glp1_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "glp1_profiles_insert_own" on public.glp1_profiles;
create policy "glp1_profiles_insert_own"
  on public.glp1_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "glp1_profiles_update_own" on public.glp1_profiles;
create policy "glp1_profiles_update_own"
  on public.glp1_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "glp1_profiles_delete_own" on public.glp1_profiles;
create policy "glp1_profiles_delete_own"
  on public.glp1_profiles for delete
  using (auth.uid() = user_id);

-- 7. GLP-1 Shot Logs ----------------------------------------------------------
create table if not exists public.glp1_shots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  medication text not null,
  dose_mg numeric(5,2) not null,
  injection_site text not null,
  injected_at timestamptz not null default now(),
  nausea_level int not null default 0,
  fatigue_level int not null default 0,
  appetite_level int not null default 2,
  notes text
);

create index if not exists glp1_shots_user_injected_idx
  on public.glp1_shots (user_id, injected_at desc);

alter table public.glp1_shots enable row level security;

drop policy if exists "glp1_shots_select_own" on public.glp1_shots;
create policy "glp1_shots_select_own"
  on public.glp1_shots for select
  using (auth.uid() = user_id);

drop policy if exists "glp1_shots_insert_own" on public.glp1_shots;
create policy "glp1_shots_insert_own"
  on public.glp1_shots for insert
  with check (auth.uid() = user_id);

drop policy if exists "glp1_shots_update_own" on public.glp1_shots;
create policy "glp1_shots_update_own"
  on public.glp1_shots for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "glp1_shots_delete_own" on public.glp1_shots;
create policy "glp1_shots_delete_own"
  on public.glp1_shots for delete
  using (auth.uid() = user_id);
