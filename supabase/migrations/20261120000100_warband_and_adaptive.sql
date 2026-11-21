-- Viking Fitness — Warband Co-op Raids & Adaptive TDEE Check-ins
-- Idempotent migration (safe on fresh or existing DBs).

-- 1. Warbands (2–5 friend co-op squads) --------------------------------------
create table if not exists public.warbands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.warband_members (
  warband_id uuid not null references public.warbands (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  week_start_date date not null,
  weekly_damage int not null default 0,
  weekly_workouts int not null default 0,
  weekly_protein_days int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (warband_id, user_id)
);

alter table public.warbands enable row level security;
alter table public.warband_members enable row level security;

drop policy if exists "warbands_select_member" on public.warbands;
create policy "warbands_select_member"
  on public.warbands for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.warband_members wm
      where wm.warband_id = warbands.id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "warbands_insert_own" on public.warbands;
create policy "warbands_insert_own"
  on public.warbands for insert
  with check (owner_id = auth.uid());

drop policy if exists "warbands_update_own" on public.warbands;
create policy "warbands_update_own"
  on public.warbands for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "warbands_delete_own" on public.warbands;
create policy "warbands_delete_own"
  on public.warbands for delete
  using (owner_id = auth.uid());

drop policy if exists "warband_members_select_squad" on public.warband_members;
create policy "warband_members_select_squad"
  on public.warband_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.warband_members self_wm
      where self_wm.warband_id = warband_members.warband_id
        and self_wm.user_id = auth.uid()
    )
  );

drop policy if exists "warband_members_insert_own" on public.warband_members;
create policy "warband_members_insert_own"
  on public.warband_members for insert
  with check (user_id = auth.uid());

drop policy if exists "warband_members_update_own" on public.warband_members;
create policy "warband_members_update_own"
  on public.warband_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "warband_members_delete_own" on public.warband_members;
create policy "warband_members_delete_own"
  on public.warband_members for delete
  using (user_id = auth.uid());

-- Safe invite-code join RPC (max 5 raiders per Longship)
create or replace function public.join_warband_by_code(
  p_code text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_band public.warbands%rowtype;
  v_count int;
  v_week_start date := date_trunc('week', current_date)::date;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select * into v_band
  from public.warbands
  where upper(invite_code) = upper(trim(p_code))
  limit 1;

  if not found then
    raise exception 'Warband code not found';
  end if;

  select count(*) into v_count
  from public.warband_members
  where warband_id = v_band.id and user_id <> v_uid;

  if v_count >= 5 then
    raise exception 'This Longship already has 5 raiders (max squad size).';
  end if;

  insert into public.warband_members (
    warband_id, user_id, display_name, week_start_date
  ) values (
    v_band.id, v_uid, coalesce(nullif(trim(p_display_name), ''), 'Warrior'), v_week_start
  )
  on conflict (warband_id, user_id) do update
    set display_name = excluded.display_name;

  return jsonb_build_object(
    'id', v_band.id,
    'name', v_band.name,
    'invite_code', v_band.invite_code
  );
end;
$$;

-- 2. Adaptive TDEE Weekly Check-Ins ------------------------------------------
create table if not exists public.adaptive_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null default current_date,
  estimated_tdee int not null,
  previous_calories int not null,
  new_calories int not null,
  accepted boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists adaptive_checkins_user_date_idx
  on public.adaptive_checkins (user_id, checkin_date desc);

alter table public.adaptive_checkins enable row level security;

drop policy if exists "adaptive_checkins_select_own" on public.adaptive_checkins;
create policy "adaptive_checkins_select_own"
  on public.adaptive_checkins for select
  using (auth.uid() = user_id);

drop policy if exists "adaptive_checkins_insert_own" on public.adaptive_checkins;
create policy "adaptive_checkins_insert_own"
  on public.adaptive_checkins for insert
  with check (auth.uid() = user_id);

drop policy if exists "adaptive_checkins_delete_own" on public.adaptive_checkins;
create policy "adaptive_checkins_delete_own"
  on public.adaptive_checkins for delete
  using (auth.uid() = user_id);
