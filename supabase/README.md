# Supabase migrations

`migrations/` is the source of truth for the LinguaLoop database. Apply each
migration once and commit it with the application change that depends on it.

## First-time setup

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

`supabase init` creates the local CLI configuration without replacing the
tracked migration directory. The dry run shows which migrations are pending
before anything is changed remotely.

The project reference is the subdomain in
`https://YOUR_PROJECT_REF.supabase.co`. Do not put a database password or
service-role key in the React application.

## Existing project database

The first migration upgrades the existing scaffold as well as creating a new
database. It:

- enables RLS on every table exposed through the public API;
- makes curriculum tables read-only to browser clients;
- creates profiles from an `auth.users` trigger, including while email
  confirmation is pending;
- adds database-level username, score, and uniqueness protection;
- restricts avatar uploads by owner, MIME type, and size.

Run `npx supabase db push`, then use the Supabase Security Advisor to confirm
that no exposed table is missing RLS.

The Week 3 migration adds learning preferences and the first two flashcard
units. It uses explicit browser-role grants as well as RLS, so the curriculum
is readable while profiles and progress remain owner-only. Apply migrations
before deploying React code that expects the new profile columns.

## Adding another migration

```bash
npx supabase migration new describe_the_change
```

Edit the generated SQL file, test it against a development project, and apply
it with `npx supabase db push`. Avoid editing an already-applied migration;
create a new one so the database history remains reproducible.
