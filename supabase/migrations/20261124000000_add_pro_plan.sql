-- Extend profiles.plan to support 'free', 'premium', and 'pro' tiers.
-- Safe to run multiple times on the live database.

do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'profiles'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%plan%';

  if c_name is not null then
    execute format('alter table public.profiles drop constraint %I', c_name);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'premium', 'pro'));
