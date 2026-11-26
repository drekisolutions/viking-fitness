-- Founding 10 Offer claims + Landing Page Feedback table

create table if not exists public.founding_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  claim_number int generated always as identity,
  granted_plan text not null default 'premium',
  expires_at timestamptz not null default (now() + interval '1 year'),
  created_at timestamptz not null default now()
);

alter table public.founding_claims enable row level security;

drop policy if exists "founding_claims_select_own" on public.founding_claims;
create policy "founding_claims_select_own"
  on public.founding_claims for select
  using (auth.uid() = user_id);

-- Public read-only RPC returning how many of the 10 founding spots remain.
create or replace function public.get_founding_spots_remaining()
returns int
language sql
security definer
set search_path = public
as $$
  select greatest(0, 10 - (select count(*)::int from public.founding_claims));
$$;

grant execute on function public.get_founding_spots_remaining() to anon, authenticated;

-- Feedback table (bug reports, improvements, feature suggestions)
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  category text not null check (category in ('bug', 'improvement', 'feature')),
  email text,
  title text not null,
  details text not null,
  platform text default 'web',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.app_feedback enable row level security;

drop policy if exists "app_feedback_insert_any" on public.app_feedback;
create policy "app_feedback_insert_any"
  on public.app_feedback for insert
  to anon, authenticated
  with check (true);
