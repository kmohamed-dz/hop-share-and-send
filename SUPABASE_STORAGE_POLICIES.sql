-- ============================================================================
-- MAAK | Storage policies for handoff proofs
-- ============================================================================
-- Run this file if you need to (re)apply storage policies only.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('handoff_proofs', 'handoff_proofs', false)
on conflict (id) do nothing;

do $storage_policies$
begin
  execute 'alter table storage.objects enable row level security';

  execute 'drop policy if exists "avatars_select_own_folder" on storage.objects';
  execute '
    create policy "avatars_select_own_folder"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = ''avatars''
      and (storage.foldername(name))[1] = auth.uid()::text
    )
  ';

  execute 'drop policy if exists "avatars_insert_own_folder" on storage.objects';
  execute '
    create policy "avatars_insert_own_folder"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = ''avatars''
      and (storage.foldername(name))[1] = auth.uid()::text
      and owner = auth.uid()
    )
  ';

  execute 'drop policy if exists "avatars_update_own_folder" on storage.objects';
  execute '
    create policy "avatars_update_own_folder"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = ''avatars''
      and (storage.foldername(name))[1] = auth.uid()::text
      and owner = auth.uid()
    )
    with check (
      bucket_id = ''avatars''
      and (storage.foldername(name))[1] = auth.uid()::text
      and owner = auth.uid()
    )
  ';

  execute 'drop policy if exists "avatars_delete_own_folder" on storage.objects';
  execute '
    create policy "avatars_delete_own_folder"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = ''avatars''
      and (storage.foldername(name))[1] = auth.uid()::text
      and owner = auth.uid()
    )
  ';

  -- Cleanup old handoff names before creating canonical ones
  execute 'drop policy if exists "Users can upload handoff proofs" on storage.objects';
  execute 'drop policy if exists "Deal participants can read handoff proofs files" on storage.objects';

  execute 'drop policy if exists "handoff_select_participants" on storage.objects';
  execute '
    create policy "handoff_select_participants"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = ''handoff_proofs''
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
        or exists (
          select 1
          from public.deals d
          where d.id::text = split_part(name, ''/'', 1)
            and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
        )
      )
    )
  ';

  execute 'drop policy if exists "handoff_insert_traveler_only" on storage.objects';
  execute '
    create policy "handoff_insert_traveler_only"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = ''handoff_proofs''
      and owner = auth.uid()
      and exists (
        select 1
        from public.deals d
        where d.id::text = split_part(name, ''/'', 1)
          and d.traveler_id = auth.uid()
      )
    )
  ';

  execute 'drop policy if exists "handoff_update_traveler_or_admin" on storage.objects';
  execute '
    create policy "handoff_update_traveler_or_admin"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = ''handoff_proofs''
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
        or exists (
          select 1
          from public.deals d
          where d.id::text = split_part(name, ''/'', 1)
            and d.traveler_id = auth.uid()
        )
      )
    )
    with check (
      bucket_id = ''handoff_proofs''
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
        or exists (
          select 1
          from public.deals d
          where d.id::text = split_part(name, ''/'', 1)
            and d.traveler_id = auth.uid()
        )
      )
    )
  ';

  execute 'drop policy if exists "handoff_delete_traveler_or_admin" on storage.objects';
  execute '
    create policy "handoff_delete_traveler_or_admin"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = ''handoff_proofs''
      and (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.is_admin = true
        )
        or exists (
          select 1
          from public.deals d
          where d.id::text = split_part(name, ''/'', 1)
            and d.traveler_id = auth.uid()
        )
      )
    )
  ';
exception
  when insufficient_privilege then
    raise notice 'Skipped storage.objects policies (insufficient privilege). Configure them in Storage -> Policies.';
  when undefined_table then
    raise notice 'storage.objects not available yet. Configure policies from Storage -> Policies.';
end;
$storage_policies$;
