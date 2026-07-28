-- LinguaLoop Week 2 security foundations
--
-- This migration is intentionally safe to apply to the existing Week 1
-- database: tables and columns are created only when missing, policies and
-- triggers are recreated deterministically, and new CHECK constraints are
-- marked NOT VALID so old test data does not block the migration. PostgreSQL
-- still enforces NOT VALID constraints for all new and changed rows.

-- Functions used only by database triggers live outside the Data API's
-- exposed public schema. Browser roles cannot call or even resolve them.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  unit_id uuid not null references public.units(id) on delete cascade,
  difficulty smallint not null default 1
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  term text not null,
  romanization text,
  audio_url text
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  native_language_id uuid references public.languages(id),
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists native_language_id uuid references public.languages(id);
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  completed_at timestamptz,
  score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.progress add column if not exists created_at timestamptz default now();
alter table public.progress add column if not exists updated_at timestamptz default now();

-- Constraints below protect writes made outside the React application too.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_format
      check (
        username is null
        or username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_length
      check (display_name is null or char_length(display_name) <= 80)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'progress_score_range'
      and conrelid = 'public.progress'::regclass
  ) then
    alter table public.progress
      add constraint progress_score_range
      check (score is null or score between 0 and 100)
      not valid;
  end if;
end
$$;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

create unique index if not exists progress_user_concept_unique
  on public.progress (user_id, concept_id);

create unique index if not exists translations_concept_language_term_unique
  on public.translations (concept_id, language_id, term);

-- PostgreSQL does not automatically index the referencing side of foreign
-- keys. These indexes avoid slow cascades and joins as lesson data grows.
create index if not exists units_language_id_idx
  on public.units (language_id);

create index if not exists concepts_unit_id_idx
  on public.concepts (unit_id);

create index if not exists profiles_native_language_id_idx
  on public.profiles (native_language_id);

create index if not exists progress_concept_id_idx
  on public.progress (concept_id);

create index if not exists translations_language_id_idx
  on public.translations (language_id);

insert into public.languages (code, name)
values
  ('en', 'English'),
  ('es', 'Spanish'),
  ('ja', 'Japanese')
on conflict (code) do update set name = excluded.name;

-- Keep timestamps correct without repeating timestamp code in the client.
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at
before update on public.progress
for each row execute function private.set_updated_at();

drop function if exists public.set_updated_at();
revoke all on function private.set_updated_at() from public, anon, authenticated;

-- New Auth users do not have a session while email confirmation is pending.
-- Creating the profile in this trigger avoids relying on an unauthenticated
-- browser insert that RLS must correctly reject.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
  chosen_display_name text;
begin
  chosen_username := lower(trim(new.raw_user_meta_data ->> 'username'));
  chosen_display_name := trim(new.raw_user_meta_data ->> 'display_name');

  if chosen_username is null
     or chosen_username !~ '^[a-z0-9][a-z0-9._-]{2,29}$' then
    chosen_username := null;
  end if;

  if chosen_display_name = '' then
    chosen_display_name := null;
  end if;

  insert into public.profiles (id, username, display_name)
  values (new.id, chosen_username, left(chosen_display_name, 80))
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

drop function if exists public.handle_new_user();

-- Preserve the project's automatic RLS safety net for future public tables,
-- but do not expose its SECURITY DEFINER function through the Data API.
drop event trigger if exists ensure_rls;

create or replace function private.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_object record;
begin
  for created_object in
    select *
    from pg_event_trigger_ddl_commands()
    where object_type = 'table'
      and schema_name = 'public'
  loop
    execute format(
      'alter table %s enable row level security',
      created_object.object_identity
    );
  end loop;
end;
$$;

revoke all on function private.rls_auto_enable()
  from public, anon, authenticated;
drop function if exists public.rls_auto_enable();

create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function private.rls_auto_enable();

-- Anonymous signup needs a yes/no username check, but never direct access to
-- other profile rows.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    check_username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'
    and not exists (
      select 1
      from public.profiles
      where lower(username) = lower(check_username)
    );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- Every table in Supabase's exposed public schema has RLS enabled.
alter table public.languages enable row level security;
alter table public.units enable row level security;
alter table public.concepts enable row level security;
alter table public.translations enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- Curriculum is publicly readable but cannot be modified with an anon or
-- authenticated browser key. Content writes use migrations or a trusted admin.
drop policy if exists "Curriculum languages are readable" on public.languages;
create policy "Curriculum languages are readable"
on public.languages for select
to anon, authenticated
using (true);

drop policy if exists "Curriculum units are readable" on public.units;
create policy "Curriculum units are readable"
on public.units for select
to anon, authenticated
using (true);

drop policy if exists "Curriculum concepts are readable" on public.concepts;
create policy "Curriculum concepts are readable"
on public.concepts for select
to anon, authenticated
using (true);

drop policy if exists "Curriculum translations are readable" on public.translations;
create policy "Curriculum translations are readable"
on public.translations for select
to anon, authenticated
using (true);

revoke all on public.languages, public.units, public.concepts, public.translations
  from anon, authenticated;
grant select on public.languages, public.units, public.concepts, public.translations
  to anon, authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can delete own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "Users can manage own progress" on public.progress;
create policy "Users can manage own progress"
on public.progress for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.progress from anon, authenticated;
grant select, insert, update, delete on public.progress to authenticated;

-- Public avatar URLs are intentional. Database object listings remain
-- owner-only; a public bucket can serve a known object URL without a broad
-- SELECT policy on storage.objects.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read access for avatars" on storage.objects;
drop policy if exists "Users can read own avatar metadata" on storage.objects;
create policy "Users can read own avatar metadata"
on storage.objects for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
