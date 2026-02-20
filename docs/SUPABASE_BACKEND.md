# MAAK Supabase Backend Checklist

## 1) Apply SQL (in order)
1. Open **Supabase Dashboard -> SQL Editor**.
2. Run `supabase/RESET_TO_MAAK.sql`.
3. Run `supabase/MAAK_SETUP.sql`.

## 2) Enable auth provider
1. Go to **Authentication -> Providers**.
2. Enable **Email/Password**.

## 3) URL configuration
Go to **Authentication -> URL Configuration** and set:

- Site URL:
  - `https://kmohamed-dz.github.io/hop-share-and-send/`

- Redirect URLs:
  - `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/callback`
  - `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/reset-password`
  - `https://kmohamed-dz.github.io/hop-share-and-send/#/auth/verify`
  - `http://localhost:5173/#/auth/callback`

Remove any old `lovable` / `v0` domains from redirect URLs.

## 4) Create first admin user
After you sign up once, run this in SQL Editor:

```sql
update public.profiles
set is_admin = true,
    role = 'admin',
    updated_at = timezone('utc', now())
where id = 'YOUR_AUTH_USER_UUID';
```

## 5) Optional auto-expiry scheduler (pg_cron)
If `pg_cron` is enabled:

```sql
select cron.schedule(
  'maak_expire_marketplace',
  '*/10 * * * *',
  $$select public.expire_marketplace_records();$$
);
```

## 6) Frontend env vars
Use these env vars only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_PUBLIC_APP_URL`
