-- ============================================================================
-- CLEANUP_LEGACY_SCHEMA.sql
-- Remove legacy schema objects before applying MAAK backend.
-- WARNING: This removes data from legacy tables.
-- ============================================================================

-- Storage policy cleanup (legacy naming)
do $cleanup_storage$
begin
  execute 'drop policy if exists library_select_school_folder on storage.objects';
  execute 'drop policy if exists library_insert_school_staff on storage.objects';
  execute 'drop policy if exists library_update_school_staff on storage.objects';
  execute 'drop policy if exists library_delete_school_staff on storage.objects';
  execute 'drop policy if exists avatars_select_authenticated on storage.objects';
exception
  when insufficient_privilege then
    raise notice 'Skipped legacy storage policy cleanup (insufficient privilege on storage.objects).';
  when undefined_table then
    raise notice 'storage.objects unavailable, skipping legacy storage policy cleanup.';
end;
$cleanup_storage$;

-- Drop existing MAAK tables/views (reset)
drop view if exists public.profile_public cascade;
drop table if exists public.handoff_proofs cascade;
drop table if exists public.delivery_codes cascade;
drop table if exists public.deal_delivery_codes cascade;
drop table if exists public.messages cascade;
drop table if exists public.ratings cascade;
drop table if exists public.reports cascade;
drop table if exists public.blocked_users cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.private_contacts cascade;
drop table if exists public.deals cascade;
drop table if exists public.parcel_requests cascade;
drop table if exists public.trips cascade;
drop table if exists public.profiles cascade;

-- Drop conflicting legacy tables
drop table if exists public.library cascade;
drop table if exists public.notifications cascade;
drop table if exists public.results cascade;
drop table if exists public.exams cascade;
drop table if exists public.homework cascade;
drop table if exists public.attendance cascade;
drop table if exists public.teachers cascade;
drop table if exists public.students cascade;
drop table if exists public.schools cascade;

-- Old helper functions (after dropping dependent tables/policies)
drop function if exists public.authority_school_overview() cascade;
drop function if exists public.resolve_school_id_by_code(text) cascade;
drop function if exists public.can_manage_school_data() cascade;
drop function if exists public.current_school_id() cascade;
drop function if exists public.generate_delivery_code_trigger() cascade;
drop function if exists public.generate_delivery_code() cascade;
drop function if exists public.verify_delivery_code(uuid, text) cascade;

-- Optional: remove old `library` bucket manually from Storage UI if needed.
-- Supabase blocks direct SQL deletion from storage tables.
