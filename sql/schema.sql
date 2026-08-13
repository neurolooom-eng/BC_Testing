-- Bestcast — Supabase schema for user profiles
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- Design:
--   auth.users        Supabase-managed. Owns email + password hash. Never touched directly.
--   public.profiles   Our app data (name, role, department, status), one row per auth user,
--                      kept in sync with the "Users" tab of data/users_master.xlsx by
--                      scripts/import_users_from_excel.py.

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  user_id      text unique not null,        -- matches "User ID (login)" in the Excel roster
  full_name    text not null,
  email        text not null,
  role         text,
  department   text,
  status       text not null default 'Active' check (status in ('Active', 'Inactive', 'Pending')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Keep updated_at current on every edit.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Row Level Security: users can only ever read/update their own profile.
-- The import script (scripts/import_users_from_excel.py) uses the service
-- role key, which bypasses RLS entirely, so it doesn't need a policy.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Self-service sign-up (public/signup.html): a newly authenticated user may
-- create their OWN profile row, but only with status 'Pending' — they can
-- never grant themselves 'Active'. An admin must flip the row to 'Active'
-- (directly in Supabase, or by setting Status in data/users_master.xlsx and
-- re-running the import script) before login.html will let them in.
drop policy if exists "profiles_insert_own_pending" on public.profiles;
create policy "profiles_insert_own_pending"
  on public.profiles for insert
  with check (auth.uid() = id and status = 'Pending');

-- Login blocks non-Active accounts client-side (see public/js/auth.js) —
-- that check trusts RLS to prevent anyone from reading someone else's row.
