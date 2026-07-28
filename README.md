# LinguaLoop

LinguaLoop is a React, Vite, and Supabase language-learning application built
as a 15-week university project. This repository currently contains the
foundation: authentication, protected routes, profiles, avatar storage,
database migrations, and GitHub Pages deployment.

## Local setup

Use Node.js 22 (the version in `.nvmrc` and the deployment workflow).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. Add the Supabase project URL and public publishable/anon key to `.env`.
   Never put a service-role key in a Vite environment variable.

4. Apply the database migrations by following
   [`supabase/README.md`](supabase/README.md).

5. Start the application:

   ```bash
   npm run dev
   ```

   Because the production project is hosted beneath `/LinguaLoop/`, Vite
   serves the local app at `http://localhost:5173/LinguaLoop/`.

## Database and authentication

The canonical database history is `supabase/migrations/`; do not maintain a
second hand-pasted schema file.

The baseline migration:

- enables Row Level Security on every table in the exposed `public` schema;
- gives browser clients read-only curriculum access;
- restricts profiles and progress to the signed-in owner;
- creates a profile from an `auth.users` trigger;
- preserves username metadata even while email confirmation is pending;
- limits avatar writes to each user's folder and restricts upload type/size.

The Auth trigger is important: with confirmation enabled, Supabase returns a
new user without a session. The browser therefore cannot insert a profile
through an authenticated RLS policy. The trigger creates it inside the same
database transaction instead.

## Supabase URL configuration

In Supabase Dashboard → Authentication → URL Configuration, set:

- Site URL: `https://k-sinclair.github.io/LinguaLoop/`
- Additional redirect URL:
  `https://k-sinclair.github.io/LinguaLoop/dashboard`
- Local redirect URL:
  `http://localhost:5173/LinguaLoop/dashboard`

The confirmation email redirects to the dashboard. If the user has no valid
session, the protected route sends them to Login.

## GitHub Pages deployment

The workflow at `.github/workflows/deploy.yml` tests, builds, and deploys every
push to `main`.

Create these GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Then open repository Settings → Pages and select **GitHub Actions** as the
publishing source.

The production artifact includes `404.html`. GitHub Pages serves that file for
direct SPA requests such as `/LinguaLoop/dashboard`; it returns the visitor to
the app base and restores the original route before React starts. This fixes
refreshes, copied protected-route links, and email-confirmation redirects.

## Checks

```bash
npm test
npm run build
```

`npm run check` runs both commands. The deployment workflow refuses to build
when either Supabase repository secret is missing.

## Current scope

Built:

- Signup, email confirmation, login, and logout
- Protected dashboard and settings routes
- Profile name, username, native language, and avatar
- RLS-protected profile and progress data
- Read-only curriculum tables

Planned:

- Lesson content and flashcards
- Practice sessions
- Progress, streaks, and points
