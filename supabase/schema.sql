create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,        -- e.g. 'es', 'ja', 'en'
  name text not null                -- e.g. 'Spanish', 'Japanese'
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  language_id uuid references public.languages(id) on delete cascade,
  title text not null,
  sort_order int default 0
);

create table if not exists public.concepts (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,        -- e.g. 'dog', 'to-eat'
  unit_id uuid references public.units(id) on delete set null,
  difficulty int default 1
);

create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid references public.concepts(id) on delete cascade,
  language_id uuid references public.languages(id) on delete cascade,
  term text not null,               -- the word/phrase in that language
  romanization text,                -- e.g. romaji for Japanese; null for Spanish
  audio_url text
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  native_language_id uuid references public.languages(id),
  display_name text,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

-- Adds the new columns even if `profiles` already existed from before
-- Settings was built.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  completed_at timestamptz,
  score int
);

-- Seed the languages the Settings page's "native language" dropdown reads
-- from, and that match our MVP tracks.
insert into public.languages (code, name) values
  ('en', 'English'),
  ('es', 'Spanish'),
  ('ja', 'Japanese')
on conflict (code) do nothing;

-- RLS's "auth.uid() = id" read policy (below) means nobody can ever SELECT
-- anyone else's profile row -- including, crucially, during signup, before
-- you're authenticated at all. That makes a direct `.select().eq('username', ...)`
-- uniqueness check always return "not taken," even when it is. This function
-- runs with elevated privileges (security definer) so it can check existence
-- without exposing any other profile data -- call it via supabase.rpc(...)
-- from both Signup and Settings instead of querying the table directly.
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where username = check_username
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- Avatars storage bucket, public read, per-user write (avatars/{user_id}/file).
-- storage.objects already has RLS enabled by default on every Supabase
-- project, so these policies are all that's needed.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for avatars" on storage.objects;
create policy "Public read access for avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Row Level Security for our own tables so the app can create and update
-- a profile row for the signed-in user without hitting policy errors.
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can delete own profile" on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete own profile"
on public.profiles
for delete
using (auth.uid() = id);

drop policy if exists "Users can manage own progress" on public.progress;

create policy "Users can manage own progress"
on public.progress
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
