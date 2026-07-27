# Language Learning App — Starter Scaffold

Vite + React + Supabase starter for the language learning app. This is the
Week 1 scaffold from the project roadmap — auth, lessons, and progress
tracking get wired up over the coming weeks.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com) if
   you haven't already.

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your project's URL and anon key
   (Supabase dashboard → Project Settings → API).

4. **Create the database tables**
   Open the SQL editor in your Supabase dashboard and run the contents of
   `supabase/schema.sql`.

5. **Run the dev server**
   ```bash
   npm run dev
   ```
   The app opens at `http://localhost:5173`.

## Project structure

```
src/
  components/   Reusable UI (NavBar, ProtectedRoute)
  pages/        Home, Login, Signup, Dashboard
  lib/          Supabase client setup
supabase/
  schema.sql    Database schema (languages, units, concepts, translations, profiles, progress)
```

## What's built vs. what's next

- ✅ Project scaffold, routing, base styling
- ✅ Supabase client wired up (needs your project's keys in `.env`)
- ✅ Database schema ready to run (**re-run `schema.sql` if you ran an older
  version** — it's safe to paste the whole file again, it only adds what's
  missing)
- ✅ Signup/login/logout logic
- ✅ Signup tells you if the email's already registered, instead of showing
  a fake "check your email" screen
- ✅ Protected routes redirect to `/login` if there's no session
- ✅ Hamburger menu (top-left, shown when logged in) opens a side panel with
  your avatar, Dashboard, Settings, and Log out
- ✅ Settings page: upload a profile photo (Supabase Storage), set a display
  name, username, native language, and change your login email
- ✅ Row Level Security on `profiles` and `progress` — each user can only
  read/write their own row (originally a Week 12 item; done early)
- ✅ Username availability checked via a `security definer` RPC
  (`is_username_available`) so it still works even though RLS blocks a
  direct `SELECT` of other users' rows
- ✅ Unit tests for the profile helpers (`npm test`, or
  `node --test src/lib/profileHelpers.test.js` — no extra dependency needed)
- ⏳ Lesson content + flashcards — Week 4–5
- ⏳ Progress tracking (streaks, points) — Week 7

Dashboard and Settings deliberately show **no fabricated data** — no fake
streaks, lesson counts, or "coming soon" buttons that don't do anything.
Anything shown is either real (your actual profile) or explicitly labeled
as not built yet.

### A note on email confirmation

By default, a new Supabase project requires users to confirm their email
before they get a session. The signup page already handles this — if no
session comes back after signup, it shows a "check your email" message
instead of erroring. You can turn email confirmation off in your Supabase
dashboard (Authentication → Providers → Email) if you'd rather test without it.

Changing your email address in Settings works the same way: Supabase sends
a confirmation link to the new address, and the login email doesn't
actually change until you click it. The Settings page tells you this when
it happens.

### A note on the avatars bucket

`schema.sql` creates a public `avatars` storage bucket and locks writes down
so each user can only upload into their own folder (`avatars/{your-user-id}/...`).
Reads are public (anyone with the URL can view an avatar), which is normal
for profile photos.

### Row Level Security

`profiles` and `progress` both have RLS on, scoped to `auth.uid() = id` /
`auth.uid() = user_id` — you can only ever read or write your own row. The
one deliberate carve-out is `is_username_available`, a `security definer`
function that checks for a taken username without exposing anyone's full
profile data.

## Note on `.env`

Never commit `.env` — it's already in `.gitignore`. Only `.env.example`
(with placeholder values) should go into GitHub.
# LinguaLoop
