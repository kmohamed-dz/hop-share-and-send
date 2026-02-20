# Supabase Runbook (MAAK)

## Goal
Apply the full backend (schema + RLS + RPC + triggers + storage + realtime) so frontend and Supabase are aligned.

## Files
- `SUPABASE_SETUP.sql`: full setup generated from `supabase/migrations/*` in order.
- `SUPABASE_STORAGE_POLICIES.sql`: storage-only policies for `handoff_proofs`.
- `supabase/CLEANUP_LEGACY_SCHEMA.sql`: optional cleanup if an old legacy schema was applied.
- `supabase/RESET_AND_APPLY_MAAK.sql`: one-click reset + full apply (drops existing MAAK/legacy tables, then recreates).

## Option A: SQL Editor (recommended now)
1. Supabase Dashboard -> `SQL Editor`.
2. Create a **new empty query**.
3. If you want the fastest path on a reused project, run `supabase/RESET_AND_APPLY_MAAK.sql`.
4. If you prefer separate steps:
5. Run `supabase/CLEANUP_LEGACY_SCHEMA.sql`.
6. Run `SUPABASE_SETUP.sql`.
7. Run `SUPABASE_STORAGE_POLICIES.sql`.

If you get `syntax error at or near "-" LINE 1`:
- You pasted Markdown/bullets, not raw SQL.
- The first line must be SQL comment `-- ...`, not `- ...`.

If you get `relation "profiles" already exists`:
- Existing schema is already present.
- Run `supabase/RESET_AND_APPLY_MAAK.sql` once, then rerun app tests.

If you get `must be owner of table objects`:
- This is a storage ownership limitation in some Supabase SQL roles.
- The new scripts handle this as `NOTICE` and continue.
- If needed, finish storage rules from `Storage -> Policies` for bucket `handoff_proofs`.

If you get `Direct deletion from storage tables is not allowed`:
- Supabase blocks `DELETE` on `storage.buckets` from SQL.
- `supabase/CLEANUP_LEGACY_SCHEMA.sql` and `supabase/RESET_AND_APPLY_MAAK.sql` now skip bucket deletion.
- If you still want to remove legacy buckets, do it from `Storage -> Buckets` in Dashboard.

If you get `cannot change return type of existing function ... generate_delivery_code()`:
- You are running an old SQL copy or a previously broken function is still present.
- Use the latest `supabase/RESET_AND_APPLY_MAAK.sql` from repo (it now handles `generate_delivery_code*` cleanup).
- Then rerun in a fresh SQL tab.

If you get `cannot change return type of existing function ... verify_delivery_code(uuid,text)`:
- The function was created earlier with a different return type in older runs.
- Use the latest `supabase/RESET_AND_APPLY_MAAK.sql` from repo (it now drops/recreates `verify_delivery_code` safely).
- Then rerun in a fresh SQL tab.

## Option B: Run migrations one-by-one
Run each file in `supabase/migrations` in this exact order:
1. `20260215233721_f60638ea-7e28-4fed-b8e3-9e6c79e84a3f.sql`
2. `20260217090000_matching_trust_handoff.sql`
3. `20260217123000_visibility_and_chat_guardrails.sql`
4. `20260217143000_deals_mvp_timestamps_and_placeholders.sql`
5. `20260218075248_e062c42f-40f9-4fb9-86e9-d539a75129ff.sql`
6. `20260218081309_f331c157-1512-4121-ad65-43ddd32365e7.sql`
7. `20260218120000_profile_required_fields.sql`
8. `20260218143000_security_lifecycle_upgrade.sql`
9. `20260218193000_admin_and_language_preference.sql`
10. `20260218203000_signup_profile_hardening.sql`

## Auth URL config (Supabase Dashboard -> Authentication -> URL Configuration)
- Site URL: `https://kmohamed-dz.github.io/hop-share-and-send/`
- Redirect URLs:
  - `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/callback`
  - `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/reset-password`
  - `http://localhost:5173/#/auth/callback`
  - `http://localhost:5173/#/auth/reset-password`

## Important
- SQL Editor runs as admin; it can bypass normal RLS checks.
- Final validation must be from the app with real authenticated users.
