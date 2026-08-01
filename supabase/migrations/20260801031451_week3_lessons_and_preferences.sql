-- LinguaLoop Week 3: learning preferences, ordered lesson content, and seeds
--
-- This migration is additive. It keeps the Week 2 ownership policies intact,
-- adds the minimum fields needed by the first real learning loop, and seeds
-- one short unit for each MVP target language.

begin;

alter table public.profiles
  add column if not exists learning_language_id uuid
    references public.languages(id) on delete set null;
alter table public.profiles
  add column if not exists daily_goal_minutes smallint not null default 10;
alter table public.profiles
  add column if not exists show_romanization boolean not null default true;

alter table public.units add column if not exists slug text;
alter table public.units
  add column if not exists description text not null default '';

alter table public.concepts
  add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_daily_goal_minutes_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_daily_goal_minutes_allowed
      check (daily_goal_minutes in (5, 10, 15, 20)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'units_sort_order_nonnegative'
      and conrelid = 'public.units'::regclass
  ) then
    alter table public.units
      add constraint units_sort_order_nonnegative
      check (sort_order >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'concepts_sort_order_nonnegative'
      and conrelid = 'public.concepts'::regclass
  ) then
    alter table public.concepts
      add constraint concepts_sort_order_nonnegative
      check (sort_order >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'concepts_difficulty_range'
      and conrelid = 'public.concepts'::regclass
  ) then
    alter table public.concepts
      add constraint concepts_difficulty_range
      check (difficulty between 1 and 5) not valid;
  end if;
end
$$;

create unique index if not exists units_language_slug_unique
  on public.units (language_id, slug)
  where slug is not null;

create unique index if not exists units_language_sort_order_unique
  on public.units (language_id, sort_order);

create unique index if not exists concepts_unit_sort_order_unique
  on public.concepts (unit_id, sort_order);

create index if not exists profiles_learning_language_id_idx
  on public.profiles (learning_language_id);

-- Existing and future learners begin on Spanish until they choose Japanese.
update public.profiles
set learning_language_id = (
  select id from public.languages where code = 'es'
)
where learning_language_id is null;

-- Keep confirm-email profile creation aligned with the new preferences.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_username text;
  chosen_display_name text;
  default_learning_language uuid;
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

  select id into default_learning_language
  from public.languages
  where code = 'es';

  insert into public.profiles (
    id,
    username,
    display_name,
    learning_language_id,
    daily_goal_minutes,
    show_romanization
  )
  values (
    new.id,
    chosen_username,
    left(chosen_display_name, 80),
    default_learning_language,
    10,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function private.handle_new_user()
  from public, anon, authenticated;

-- The migration starts from zero curriculum rows, but these statements also
-- make a replay safe if the two unit slugs have already been seeded.
insert into public.units (
  id,
  language_id,
  slug,
  title,
  description,
  sort_order
)
select
  gen_random_uuid(),
  languages.id,
  seed.slug,
  seed.title,
  seed.description,
  seed.sort_order
from (
  values
    ('es', 'spanish-greetings', 'Spanish greetings',
      'Meet someone, be polite, and finish a simple first conversation.', 0),
    ('ja', 'hiragana-foundations', 'Hiragana foundations',
      'Recognise the first ten hiragana and connect each symbol to its sound.', 0)
) as seed(language_code, slug, title, description, sort_order)
join public.languages on languages.code = seed.language_code
on conflict (language_id, slug) where slug is not null
do update set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order;

alter table public.units alter column slug set not null;

with concept_seed(language_code, unit_slug, slug, difficulty, sort_order) as (
  values
    ('es', 'spanish-greetings', 'es-greetings-hello', 1, 0),
    ('es', 'spanish-greetings', 'es-greetings-good-morning', 1, 1),
    ('es', 'spanish-greetings', 'es-greetings-good-afternoon', 1, 2),
    ('es', 'spanish-greetings', 'es-greetings-good-night', 1, 3),
    ('es', 'spanish-greetings', 'es-greetings-please', 1, 4),
    ('es', 'spanish-greetings', 'es-greetings-thank-you', 1, 5),
    ('es', 'spanish-greetings', 'es-greetings-youre-welcome', 1, 6),
    ('es', 'spanish-greetings', 'es-greetings-how-are-you', 2, 7),
    ('es', 'spanish-greetings', 'es-greetings-very-well', 2, 8),
    ('es', 'spanish-greetings', 'es-greetings-goodbye', 1, 9),
    ('ja', 'hiragana-foundations', 'ja-hiragana-a', 1, 0),
    ('ja', 'hiragana-foundations', 'ja-hiragana-i', 1, 1),
    ('ja', 'hiragana-foundations', 'ja-hiragana-u', 1, 2),
    ('ja', 'hiragana-foundations', 'ja-hiragana-e', 1, 3),
    ('ja', 'hiragana-foundations', 'ja-hiragana-o', 1, 4),
    ('ja', 'hiragana-foundations', 'ja-hiragana-ka', 1, 5),
    ('ja', 'hiragana-foundations', 'ja-hiragana-ki', 1, 6),
    ('ja', 'hiragana-foundations', 'ja-hiragana-ku', 1, 7),
    ('ja', 'hiragana-foundations', 'ja-hiragana-ke', 1, 8),
    ('ja', 'hiragana-foundations', 'ja-hiragana-ko', 1, 9)
)
insert into public.concepts (
  id,
  slug,
  unit_id,
  difficulty,
  sort_order
)
select
  gen_random_uuid(),
  concept_seed.slug,
  units.id,
  concept_seed.difficulty,
  concept_seed.sort_order
from concept_seed
join public.languages on languages.code = concept_seed.language_code
join public.units
  on units.language_id = languages.id
 and units.slug = concept_seed.unit_slug
on conflict (slug) do update set
  unit_id = excluded.unit_id,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order;

with translation_seed(concept_slug, language_code, term, romanization) as (
  values
    ('es-greetings-hello', 'en', 'Hello', null),
    ('es-greetings-hello', 'es', 'Hola', null),
    ('es-greetings-good-morning', 'en', 'Good morning', null),
    ('es-greetings-good-morning', 'es', 'Buenos días', null),
    ('es-greetings-good-afternoon', 'en', 'Good afternoon', null),
    ('es-greetings-good-afternoon', 'es', 'Buenas tardes', null),
    ('es-greetings-good-night', 'en', 'Good night', null),
    ('es-greetings-good-night', 'es', 'Buenas noches', null),
    ('es-greetings-please', 'en', 'Please', null),
    ('es-greetings-please', 'es', 'Por favor', null),
    ('es-greetings-thank-you', 'en', 'Thank you', null),
    ('es-greetings-thank-you', 'es', 'Gracias', null),
    ('es-greetings-youre-welcome', 'en', 'You’re welcome', null),
    ('es-greetings-youre-welcome', 'es', 'De nada', null),
    ('es-greetings-how-are-you', 'en', 'How are you?', null),
    ('es-greetings-how-are-you', 'es', '¿Cómo estás?', null),
    ('es-greetings-very-well', 'en', 'Very well', null),
    ('es-greetings-very-well', 'es', 'Muy bien', null),
    ('es-greetings-goodbye', 'en', 'Goodbye', null),
    ('es-greetings-goodbye', 'es', 'Adiós', null),
    ('ja-hiragana-a', 'en', 'The hiragana for “a”', null),
    ('ja-hiragana-a', 'ja', 'あ', 'a'),
    ('ja-hiragana-i', 'en', 'The hiragana for “i”', null),
    ('ja-hiragana-i', 'ja', 'い', 'i'),
    ('ja-hiragana-u', 'en', 'The hiragana for “u”', null),
    ('ja-hiragana-u', 'ja', 'う', 'u'),
    ('ja-hiragana-e', 'en', 'The hiragana for “e”', null),
    ('ja-hiragana-e', 'ja', 'え', 'e'),
    ('ja-hiragana-o', 'en', 'The hiragana for “o”', null),
    ('ja-hiragana-o', 'ja', 'お', 'o'),
    ('ja-hiragana-ka', 'en', 'The hiragana for “ka”', null),
    ('ja-hiragana-ka', 'ja', 'か', 'ka'),
    ('ja-hiragana-ki', 'en', 'The hiragana for “ki”', null),
    ('ja-hiragana-ki', 'ja', 'き', 'ki'),
    ('ja-hiragana-ku', 'en', 'The hiragana for “ku”', null),
    ('ja-hiragana-ku', 'ja', 'く', 'ku'),
    ('ja-hiragana-ke', 'en', 'The hiragana for “ke”', null),
    ('ja-hiragana-ke', 'ja', 'け', 'ke'),
    ('ja-hiragana-ko', 'en', 'The hiragana for “ko”', null),
    ('ja-hiragana-ko', 'ja', 'こ', 'ko')
)
insert into public.translations (
  id,
  concept_id,
  language_id,
  term,
  romanization
)
select
  gen_random_uuid(),
  concepts.id,
  languages.id,
  translation_seed.term,
  translation_seed.romanization
from translation_seed
join public.concepts on concepts.slug = translation_seed.concept_slug
join public.languages on languages.code = translation_seed.language_code
on conflict (concept_id, language_id, term) do update set
  romanization = excluded.romanization;

-- Validate Week 2 and Week 3 checks now that the small existing dataset and
-- all seed rows satisfy them. New rows were protected even while NOT VALID.
alter table public.profiles validate constraint profiles_username_format;
alter table public.profiles validate constraint profiles_display_name_length;
alter table public.profiles validate constraint profiles_daily_goal_minutes_allowed;
alter table public.progress validate constraint progress_score_range;
alter table public.units validate constraint units_sort_order_nonnegative;
alter table public.concepts validate constraint concepts_sort_order_nonnegative;
alter table public.concepts validate constraint concepts_difficulty_range;

-- Repeat least-privilege grants explicitly so this migration remains correct
-- as Supabase moves new projects toward opt-in Data API exposure.
revoke all on public.languages, public.units, public.concepts, public.translations
  from anon, authenticated;
grant select on public.languages, public.units, public.concepts, public.translations
  to anon, authenticated;

revoke all on public.profiles, public.progress from anon, authenticated;
grant select, insert, update, delete on public.profiles, public.progress
  to authenticated;

commit;
