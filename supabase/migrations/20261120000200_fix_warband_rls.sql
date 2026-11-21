-- Viking Fitness — Fix infinite RLS recursion on warband_members / warbands
-- Moves squad membership lookup into a SECURITY DEFINER helper so SELECT
-- policies on warband_members and warbands never recurse (PostgreSQL 42P17).

create or replace function public.is_warband_member(p_warband_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.warband_members wm
    where wm.warband_id = p_warband_id
      and wm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_warband_member(uuid) from public;
grant execute on function public.is_warband_member(uuid) to authenticated;

drop policy if exists "warbands_select_member" on public.warbands;
create policy "warbands_select_member"
  on public.warbands for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_warband_member(id)
  );

drop policy if exists "warband_members_select_squad" on public.warband_members;
create policy "warband_members_select_squad"
  on public.warband_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_warband_member(warband_id)
  );
