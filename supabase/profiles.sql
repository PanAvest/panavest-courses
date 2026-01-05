-- Profiles table to keep auth metadata in a relational table keyed by user id
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  age int,
  highest_education text,
  country_code text,
  country_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Make sure new columns exist if the table was already created
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists highest_education text;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles add column if not exists country_name text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Sync auth metadata into the profiles table when a user is created/updated
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, age, date_of_birth, highest_education, country_code, country_name, created_at, updated_at)
  values (
    new.id,
    nullif(trim((new.raw_user_meta_data->>'full_name')::text), ''),
    nullif((new.raw_user_meta_data->>'age')::int, 0),
    nullif((new.raw_user_meta_data->>'date_of_birth')::date, null),
    nullif(trim((new.raw_user_meta_data->>'highest_education')::text), ''),
    nullif(trim((new.raw_user_meta_data->>'country_code')::text), ''),
    nullif(trim((new.raw_user_meta_data->>'country_name')::text), ''),
    now(),
    now()
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        age = excluded.age,
        date_of_birth = excluded.date_of_birth,
        highest_education = excluded.highest_education,
        country_code = excluded.country_code,
        country_name = excluded.country_name,
        updated_at = now();
  return new;
end;
$$;

-- Trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.sync_profile_from_auth();

-- Trigger for metadata updates on auth.users (covers edits to raw_user_meta_data)
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of raw_user_meta_data on auth.users
for each row execute procedure public.sync_profile_from_auth();

-- RLS: users can see and update their own profile
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Basic grants for authenticated users
grant select, update on public.profiles to authenticated;
