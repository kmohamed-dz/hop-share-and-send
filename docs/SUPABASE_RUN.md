# Supabase Setup Runbook

This project includes `SUPABASE_SETUP.sql` to provision schema, RLS policies, triggers, and storage policies.

## Option A: Supabase SQL Editor
1. Open your Supabase project dashboard.
2. Go to `SQL Editor`.
3. Open `SUPABASE_SETUP.sql` from this repo.
4. Paste and run the full script.

## Option B: Supabase CLI Migrations
1. Ensure Supabase CLI is installed and authenticated.
2. Create a migration and copy the SQL:
   - `supabase migration new init_abshr_schema`
   - Paste contents of `SUPABASE_SETUP.sql` into the new migration file.
3. Link and push:
   - `supabase link --project-ref <your-project-ref>`
   - `supabase db push`

## Important Warning
- SQL Editor runs with elevated privileges and can bypass normal RLS behavior.
- Always validate security from the app itself with a real authenticated session.
- If you see `must be owner of table objects`, it means your SQL role cannot alter `storage.objects`.
  The script now skips storage policy DDL safely and continues; you can then create storage policies from `Storage -> Policies`.

## Required Supabase Auth URL Configuration
In Supabase Dashboard:
1. Go to `Authentication` -> `URL Configuration`.
2. Set:
   - `Site URL`: `http://localhost:3000`
   - `Redirect URLs`:
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/update-password`
