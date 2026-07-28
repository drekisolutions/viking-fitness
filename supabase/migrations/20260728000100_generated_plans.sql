-- Viking Fitness — AI-generated plans (meal / workout)
-- Stores the latest AI-generated meal and workout plans per user so they
-- persist across sessions and don't regenerate (and re-bill the model) on
-- every screen open. Written by the generate-plan edge function (service role);
-- read by the client (RLS-scoped to the owner).
-- Safe to apply on an existing database (IF NOT EXISTS / DROP-then-CREATE).

create table if not exists public.generated_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('meal', 'workout')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- Fast "latest plan of this type for this user" lookup.
create index if not exists generated_plans_user_type_created_idx
  on public.generated_plans (user_id, type, created_at desc);

alter table public.generated_plans enable row level security;

drop policy if exists "generated_plans_select_own" on public.generated_plans;
create policy "generated_plans_select_own"
  on public.generated_plans for select
  using (auth.uid() = user_id);

drop policy if exists "generated_plans_insert_own" on public.generated_plans;
create policy "generated_plans_insert_own"
  on public.generated_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "generated_plans_delete_own" on public.generated_plans;
create policy "generated_plans_delete_own"
  on public.generated_plans for delete
  using (auth.uid() = user_id);
