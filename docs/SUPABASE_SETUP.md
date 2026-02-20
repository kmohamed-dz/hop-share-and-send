# Supabase Setup (MAAK)

## Use this for a full fresh backend setup
1. Open Supabase SQL Editor.
2. Create a new query.
3. Recommended on reused projects: run `supabase/RESET_AND_APPLY_MAAK.sql` once.
4. Or manually run:
5. `supabase/CLEANUP_LEGACY_SCHEMA.sql`
6. `SUPABASE_SETUP.sql`
7. `SUPABASE_STORAGE_POLICIES.sql`

## If you see this error
`ERROR: syntax error at or near "-" LINE 1`

It means the pasted content starts with Markdown bullets (`- ...`) instead of SQL comments (`-- ...`).
Use the SQL file directly from the repo.

## If you see this error
`ERROR: relation "profiles" already exists`

Run `supabase/RESET_AND_APPLY_MAAK.sql` first, then rerun your setup.

## If you see this error
`ERROR: must be owner of table objects`

Storage policy DDL can be restricted by owner role.  
Use `supabase/RESET_AND_APPLY_MAAK.sql` (it continues safely), then configure bucket policies in `Storage -> Policies` if required.

## If you see this error
`ERROR: Direct deletion from storage tables is not allowed`

Supabase prevents `DELETE` on `storage.buckets` from SQL editor.
Use the updated scripts (bucket delete removed) and, if needed, remove old buckets from `Storage -> Buckets` UI.

## Project URL config
Site URL:
- `https://kmohamed-dz.github.io/hop-share-and-send/`

Redirect URLs:
- `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/callback`
- `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/reset-password`
- `http://localhost:5173/#/auth/callback`
- `http://localhost:5173/#/auth/reset-password`

## Note
`SUPABASE_SETUP.sql` is generated from `supabase/migrations/*` in timestamp order, so it matches frontend expectations.
