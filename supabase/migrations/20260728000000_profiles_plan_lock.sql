-- Viking Fitness — profiles table, RLS, and plan-column lock
-- Schema-as-code for the `profiles` table that the app and the payment webhooks
-- read/write. Written to be SAFE to apply on the existing live database:
-- everything is IF NOT EXISTS / CREATE OR REPLACE / DROP-then-CREATE, so it will
-- not clobber existing data.
--
-- The security-critical part is the plan lock: profiles.plan is the revenue gate
-- and must be writable ONLY by the service role (the Stripe / RevenueCat
-- webhooks). Without this, any authenticated user can PATCH their own row to
-- plan='premium' for free, because row-level RLS does not restrict columns.

-- 1. Table (no-op if it already exists) --------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  age int,
  sex text,
  height_ft int,
  height_in int,
  weight_lbs numeric,
  goal text,
  meal_plan text,
  activity_level numeric,
  activity_label text,
  calories int,
  protein int,
  carbs int,
  fat int,
  bmi numeric,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ensure columns exist even if the table predates this migration.
alter table public.profiles add column if not exists bmi numeric;
alter table public.profiles add column if not exists plan text not null default 'free';
alter table public.profiles add column if not exists onboarding_complete boolean not null default false;

-- 2. Row Level Security ------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Plan lock ---------------------------------------------------------------
-- Force plan to its prior value (or 'free' on insert) for any writer that is
-- NOT the service role. The service role (webhooks) bypasses this and may set
-- plan freely. Triggers run regardless of RLS, so this closes the self-grant.
create or replace function public.lock_plan_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  );
begin
  if jwt_role <> 'service_role' then
    if tg_op = 'INSERT' then
      new.plan := 'free';
    elsif tg_op = 'UPDATE' then
      new.plan := old.plan;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_plan_column on public.profiles;
create trigger lock_plan_column
  before insert or update on public.profiles
  for each row execute function public.lock_plan_column();

-- Note for manual admin edits via the SQL editor (no JWT context): the lock
-- treats you as non-service, so plan changes are ignored. To hand-edit plan,
-- temporarily `alter table public.profiles disable trigger lock_plan_column;`,
-- make the change, then re-enable it.
