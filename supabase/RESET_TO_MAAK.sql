-- ============================================================================
-- MAAK | Reset public schema to MAAK scope (safe + idempotent)
-- ============================================================================
-- هدف الملف:
-- 1) عرض كل جداول public الحالية (غير النظامية).
-- 2) حذف الجداول التي لا تنتمي إلى نطاق MAAK فقط.
-- 3) ترك جداول النظام كما هي (auth/storage/realtime/extensions/...).
--
-- ملاحظة:
-- هذا السكربت لا يلمس schemas النظام.
-- ============================================================================

-- 1) Snapshot: all current public tables
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;

create temporary table if not exists _maak_allow_tables (
  table_name text primary key
) on commit drop;

truncate table _maak_allow_tables;

-- Core MAAK allow-list (requested)
insert into _maak_allow_tables (table_name) values
  ('profiles'),
  ('traveler_profiles'),
  ('trips'),
  ('parcel_requests'),
  ('deals'),
  ('messages'),
  ('deal_events'),
  ('ratings'),
  ('reports'),
  ('blocked_users'),
  ('delivery_codes'),
  ('handoff_proofs')
on conflict do nothing;

-- Keep additional tables referenced by existing repo migrations
insert into _maak_allow_tables (table_name) values
  ('private_contacts'),
  ('user_settings'),
  ('deal_delivery_codes')
on conflict do nothing;

-- 2) Drop only non-allow-listed tables in public schema
--    (no system schemas touched)
do $drop_non_maak$
declare
  rec record;
begin
  for rec in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in (select table_name from _maak_allow_tables)
    order by tablename
  loop
    execute format('drop table if exists public.%I cascade', rec.tablename);
    raise notice 'Dropped non-MAAK table: %', rec.tablename;
  end loop;
end;
$drop_non_maak$;

-- 3) Verification query: remaining public tables
select tablename
from pg_tables
where schemaname = 'public'
order by tablename;
