-- ============================================================================
-- MAAK | Canonical backend setup (Postgres + RLS + Storage + Realtime)
-- ============================================================================
-- This file is the single source of truth for MAAK backend.
-- It rebuilds MAAK tables/functions/policies in an idempotent way.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Cleanup known conflicting objects (idempotent)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;

drop trigger if exists deals_updated_at on public.deals;
drop trigger if exists trips_updated_at on public.trips;
drop trigger if exists parcel_requests_updated_at on public.parcel_requests;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists traveler_profiles_updated_at on public.traveler_profiles;
drop trigger if exists user_settings_updated_at on public.user_settings;
drop trigger if exists sync_private_contacts_from_profiles_trigger on public.profiles;
drop trigger if exists deals_active_lock_trigger on public.deals;
drop trigger if exists deals_generate_code_trigger on public.deals;
drop trigger if exists deals_status_event_trigger on public.deals;
drop trigger if exists profiles_sync_compatibility_trigger on public.profiles;
drop trigger if exists trips_sync_compatibility_trigger on public.trips;
drop trigger if exists parcels_sync_compatibility_trigger on public.parcel_requests;
drop trigger if exists deals_sync_compatibility_trigger on public.deals;
drop trigger if exists ratings_sync_compatibility_trigger on public.ratings;
drop trigger if exists reports_sync_compatibility_trigger on public.reports;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.update_updated_at_column() cascade;
drop function if exists public.is_admin_user(uuid) cascade;
drop function if exists public.is_admin_user() cascade;
drop function if exists public.can_view_phone(uuid) cascade;
drop function if exists public.is_deal_participant(uuid, uuid) cascade;
drop function if exists public.has_active_deal(uuid) cascade;
drop function if exists public.has_active_deal() cascade;
drop function if exists public.expire_marketplace_records() cascade;
drop function if exists public.generate_delivery_code() cascade;
drop function if exists public.generate_delivery_code_trigger() cascade;
drop function if exists public.generate_delivery_code_value() cascade;
drop function if exists public.create_delivery_code_for_deal() cascade;
drop function if exists public.ensure_delivery_code_hash_on_mutual_accept() cascade;
drop function if exists public.log_deal_status_event() cascade;
drop function if exists public.sync_profile_compatibility() cascade;
drop function if exists public.sync_trip_compatibility() cascade;
drop function if exists public.sync_parcel_compatibility() cascade;
drop function if exists public.sync_deal_compatibility() cascade;
drop function if exists public.sync_rating_compatibility() cascade;
drop function if exists public.sync_report_compatibility() cascade;
drop function if exists public.sync_private_contact_from_profile() cascade;
drop function if exists public.infer_size_from_legacy(text) cascade;
drop function if exists public.recompute_deal_status(uuid) cascade;
drop function if exists public.propose_deal(uuid, uuid) cascade;
drop function if exists public.accept_deal(uuid) cascade;
drop function if exists public.accept_deal(uuid, text) cascade;
drop function if exists public.set_pickup_place(uuid, text) cascade;
drop function if exists public.set_dropoff_place(uuid, text) cascade;
drop function if exists public.confirm_pickup(uuid, boolean, boolean, text) cascade;
drop function if exists public.verify_delivery_code(uuid, text) cascade;
drop function if exists public.issue_delivery_code_for_sender(uuid) cascade;
drop function if exists public.issue_delivery_code_for_owner(uuid) cascade;
drop function if exists public.close_deal(uuid) cascade;
drop function if exists public.admin_assert_is_admin() cascade;
drop function if exists public.admin_get_stats() cascade;
drop function if exists public.admin_get_users(integer, integer) cascade;
drop function if exists public.admin_get_trips(integer, integer) cascade;
drop function if exists public.admin_get_parcels(integer, integer) cascade;
drop function if exists public.admin_get_deals(integer, integer) cascade;
drop function if exists public.admin_get_messages(integer, integer) cascade;

drop view if exists public.profile_public cascade;

-- Rebuild core MAAK tables (deterministic)
drop table if exists public.handoff_proofs cascade;
drop table if exists public.delivery_codes cascade;
drop table if exists public.deal_events cascade;
drop table if exists public.messages cascade;
drop table if exists public.ratings cascade;
drop table if exists public.reports cascade;
drop table if exists public.blocked_users cascade;
drop table if exists public.deals cascade;
drop table if exists public.parcel_requests cascade;
drop table if exists public.trips cascade;
drop table if exists public.traveler_profiles cascade;
drop table if exists public.private_contacts cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.deal_delivery_codes cascade;
drop table if exists public.profiles cascade;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  role text not null default 'both'
    check (role in ('sender', 'traveler', 'both', 'admin')),
  wilaya_code integer check (wilaya_code between 1 and 58),
  language_preference text not null default 'fr'
    check (language_preference in ('fr', 'ar')),
  is_admin boolean not null default false,
  rating_avg numeric not null default 0,
  completed_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- Compatibility with existing frontend/migrations
  user_id uuid unique,
  name text,
  role_preference text default 'both'
    check (role_preference in ('sender', 'traveler', 'both', 'owner')),
  profile_complete boolean not null default false
);

create table public.traveler_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  vehicle_type text,
  rating numeric not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  traveler_id uuid not null references auth.users(id) on delete cascade,
  origin_wilaya integer not null check (origin_wilaya between 1 and 58),
  destination_wilaya integer not null check (destination_wilaya between 1 and 58),
  departure_time timestamptz not null,
  capacity text,
  categories text[] not null default '{}',
  status text not null default 'active'
    check (status in ('active', 'completed', 'expired', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- Compatibility
  user_id uuid,
  departure_date timestamptz,
  capacity_note text,
  accepted_categories text[] not null default '{}'
);

create table public.parcel_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  origin_wilaya integer not null check (origin_wilaya between 1 and 58),
  destination_wilaya integer not null check (destination_wilaya between 1 and 58),
  time_window_start timestamptz,
  time_window_end timestamptz,
  category text not null,
  size text not null check (size in ('small', 'medium', 'large')),
  weight_kg numeric,
  photo_url text,
  reward_amount numeric not null default 0,
  currency text not null default 'DZD',
  forbidden_ack boolean not null default false,
  pickup_place text,
  dropoff_place text,
  status text not null default 'open'
    check (status in ('open', 'matched', 'in_transit', 'delivered', 'cancelled', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- Compatibility
  user_id uuid,
  date_window_start timestamptz,
  date_window_end timestamptz,
  size_weight text,
  reward_dzd numeric,
  forbidden_items_acknowledged boolean,
  delivery_point_address text,
  delivery_point_type text,
  notes text
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  parcel_id uuid not null references public.parcel_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  traveler_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'proposed'
    check (
      status in (
        'proposed',
        'accepted_by_sender',
        'accepted_by_traveler',
        'mutually_accepted',
        'picked_up',
        'delivered_confirmed',
        'closed',
        'cancelled'
      )
    ),
  sender_accepted_at timestamptz,
  traveler_accepted_at timestamptz,
  pickup_confirmed_at timestamptz,
  delivered_confirmed_at timestamptz,
  pickup_place text,
  dropoff_place text,
  payment_status text not null default 'none'
    check (payment_status in ('none', 'releasable', 'released')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  -- Compatibility
  owner_user_id uuid,
  traveler_user_id uuid,
  parcel_request_id uuid,
  pickup_point_address text,
  accepted_at timestamptz,
  delivery_confirmed_at timestamptz,
  delivered_at timestamptz,
  closed_at timestamptz,
  status_updated_at timestamptz,
  owner_confirmed_pickup boolean,
  owner_confirmed_delivery boolean,
  traveler_confirmed_pickup boolean,
  traveler_confirmed_delivery boolean
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  rated_user_id uuid not null references auth.users(id) on delete cascade,
  stars integer not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),

  -- Compatibility
  from_user_id uuid,
  to_user_id uuid,

  unique (deal_id, rater_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default timezone('utc', now()),

  -- Compatibility
  reporter_user_id uuid,
  target_user_id uuid
);

create table public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (blocker_user_id, blocked_user_id)
);

create table public.delivery_codes (
  deal_id uuid primary key references public.deals(id) on delete cascade,
  code_hash text not null,
  code_last4 text,
  created_at timestamptz not null default timezone('utc', now()),
  consumed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade,
  consumed_by uuid references auth.users(id) on delete set null
);

create table public.handoff_proofs (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  type text not null check (type in ('pickup')),
  photo_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid not null references auth.users(id) on delete cascade
);

-- Optional compatibility tables still used by current frontend
create table public.private_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'fr' check (language in ('fr', 'ar')),
  notifications_enabled boolean not null default true,
  theme text not null default 'light',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_profiles_created_at on public.profiles (created_at desc);
create index idx_profiles_role on public.profiles (role);
create index idx_profiles_is_admin on public.profiles (is_admin);

create index idx_traveler_profiles_user_id on public.traveler_profiles (user_id);
create index idx_traveler_profiles_created_at on public.traveler_profiles (created_at desc);

create index idx_trips_traveler_id on public.trips (traveler_id);
create index idx_trips_user_id on public.trips (user_id);
create index idx_trips_status on public.trips (status);
create index idx_trips_created_at on public.trips (created_at desc);
create index idx_trips_route_departure on public.trips (origin_wilaya, destination_wilaya, departure_time);

create index idx_parcel_sender_id on public.parcel_requests (sender_id);
create index idx_parcel_user_id on public.parcel_requests (user_id);
create index idx_parcel_status on public.parcel_requests (status);
create index idx_parcel_created_at on public.parcel_requests (created_at desc);
create index idx_parcel_route_status_created on public.parcel_requests (origin_wilaya, destination_wilaya, status, created_at desc);

create index idx_deals_trip_id on public.deals (trip_id);
create index idx_deals_parcel_id on public.deals (parcel_id);
create index idx_deals_sender_id on public.deals (sender_id);
create index idx_deals_traveler_id on public.deals (traveler_id);
create index idx_deals_owner_user_id on public.deals (owner_user_id);
create index idx_deals_traveler_user_id on public.deals (traveler_user_id);
create index idx_deals_status_created on public.deals (status, created_at desc);

create index idx_messages_deal_id on public.messages (deal_id);
create index idx_messages_sender_id on public.messages (sender_id);
create index idx_messages_created_at on public.messages (created_at desc);

create index idx_deal_events_deal_id on public.deal_events (deal_id);
create index idx_deal_events_actor_id on public.deal_events (actor_id);
create index idx_deal_events_created_at on public.deal_events (created_at desc);

create index idx_ratings_deal_id on public.ratings (deal_id);
create index idx_ratings_rater_id on public.ratings (rater_id);
create index idx_ratings_rated_user_id on public.ratings (rated_user_id);
create index idx_ratings_created_at on public.ratings (created_at desc);

create index idx_reports_deal_id on public.reports (deal_id);
create index idx_reports_reporter_id on public.reports (reporter_id);
create index idx_reports_reported_user_id on public.reports (reported_user_id);
create index idx_reports_created_at on public.reports (created_at desc);

create index idx_delivery_codes_created_by on public.delivery_codes (created_by);
create index idx_delivery_codes_consumed_by on public.delivery_codes (consumed_by);
create index idx_delivery_codes_created_at on public.delivery_codes (created_at desc);

create index idx_handoff_proofs_deal_id on public.handoff_proofs (deal_id);
create index idx_handoff_proofs_created_by on public.handoff_proofs (created_by);
create index idx_handoff_proofs_created_at on public.handoff_proofs (created_at desc);

create index idx_private_contacts_updated_at on public.private_contacts (updated_at desc);
create index idx_user_settings_updated_at on public.user_settings (updated_at desc);

-- ---------------------------------------------------------------------------
-- Triggers + compatibility sync
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_profile_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.user_id := coalesce(new.user_id, new.id);
  new.id := coalesce(new.id, new.user_id);

  new.full_name := nullif(trim(coalesce(new.full_name, new.name, '')), '');
  if new.full_name is null then
    new.full_name := 'Utilisateur MAAK';
  end if;

  if new.name is null or trim(new.name) = '' then
    new.name := new.full_name;
  end if;

  if new.role_preference is null then
    new.role_preference := case
      when new.role = 'traveler' then 'traveler'
      when new.role = 'sender' then 'sender'
      else 'both'
    end;
  end if;

  if new.role is null then
    new.role := case
      when new.role_preference = 'traveler' then 'traveler'
      when new.role_preference in ('sender', 'owner') then 'sender'
      else 'both'
    end;
  end if;

  new.profile_complete := (nullif(trim(coalesce(new.full_name, '')), '') is not null);
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_trip_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.traveler_id := coalesce(new.traveler_id, new.user_id);
  new.user_id := coalesce(new.user_id, new.traveler_id);

  new.departure_time := coalesce(new.departure_time, new.departure_date);
  new.departure_date := coalesce(new.departure_date, new.departure_time);

  new.capacity := coalesce(new.capacity, new.capacity_note);
  new.capacity_note := coalesce(new.capacity_note, new.capacity);

  new.categories := coalesce(new.categories, new.accepted_categories, '{}');
  new.accepted_categories := coalesce(new.accepted_categories, new.categories, '{}');

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.infer_size_from_legacy(p_size_weight text)
returns text
language sql
immutable
as $$
  select case
    when p_size_weight is null then 'small'
    when lower(p_size_weight) like '%large%' then 'large'
    when lower(p_size_weight) like '%grand%' then 'large'
    when lower(p_size_weight) like '%medium%' then 'medium'
    when lower(p_size_weight) like '%moyen%' then 'medium'
    else 'small'
  end
$$;

create or replace function public.sync_parcel_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.sender_id := coalesce(new.sender_id, new.user_id);
  new.user_id := coalesce(new.user_id, new.sender_id);

  new.time_window_start := coalesce(new.time_window_start, new.date_window_start);
  new.time_window_end := coalesce(new.time_window_end, new.date_window_end);
  new.date_window_start := coalesce(new.date_window_start, new.time_window_start);
  new.date_window_end := coalesce(new.date_window_end, new.time_window_end);

  if new.size is null then
    new.size := public.infer_size_from_legacy(new.size_weight);
  end if;
  if new.size_weight is null then
    new.size_weight := new.size;
  end if;

  new.reward_amount := coalesce(new.reward_amount, new.reward_dzd, 0);
  new.reward_dzd := coalesce(new.reward_dzd, new.reward_amount, 0);

  new.forbidden_ack := coalesce(new.forbidden_ack, new.forbidden_items_acknowledged, false);
  new.forbidden_items_acknowledged := coalesce(new.forbidden_items_acknowledged, new.forbidden_ack, false);

  new.dropoff_place := coalesce(new.dropoff_place, new.delivery_point_address);
  new.delivery_point_address := coalesce(new.delivery_point_address, new.dropoff_place);

  if new.status = 'active' then
    new.status := 'open';
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_deal_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.sender_id := coalesce(new.sender_id, new.owner_user_id);
  new.owner_user_id := coalesce(new.owner_user_id, new.sender_id);

  new.traveler_id := coalesce(new.traveler_id, new.traveler_user_id);
  new.traveler_user_id := coalesce(new.traveler_user_id, new.traveler_id);

  new.parcel_id := coalesce(new.parcel_id, new.parcel_request_id);
  new.parcel_request_id := coalesce(new.parcel_request_id, new.parcel_id);

  new.pickup_place := coalesce(new.pickup_place, new.pickup_point_address);
  new.pickup_point_address := coalesce(new.pickup_point_address, new.pickup_place);

  if new.status = 'pickup_confirmed' then
    new.status := 'picked_up';
  elsif new.status = 'delivered' then
    new.status := 'delivered_confirmed';
  elsif new.status = 'accepted' then
    new.status := 'mutually_accepted';
  end if;

  if new.status = 'mutually_accepted' and new.accepted_at is null then
    new.accepted_at := timezone('utc', now());
  end if;

  if new.status = 'picked_up' and new.pickup_confirmed_at is null then
    new.pickup_confirmed_at := timezone('utc', now());
  end if;

  if new.status = 'delivered_confirmed' and new.delivered_confirmed_at is null then
    new.delivered_confirmed_at := timezone('utc', now());
  end if;

  if new.status = 'closed' and new.closed_at is null then
    new.closed_at := timezone('utc', now());
  end if;

  new.delivery_confirmed_at := coalesce(new.delivery_confirmed_at, new.delivered_confirmed_at);
  new.delivered_at := coalesce(new.delivered_at, new.delivered_confirmed_at);

  new.traveler_confirmed_pickup := coalesce(new.traveler_confirmed_pickup, new.status = 'picked_up');
  new.traveler_confirmed_delivery := coalesce(new.traveler_confirmed_delivery, new.status in ('delivered_confirmed', 'closed'));
  new.owner_confirmed_delivery := coalesce(new.owner_confirmed_delivery, new.status in ('delivered_confirmed', 'closed'));

  new.status_updated_at := timezone('utc', now());
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_rating_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.rater_id := coalesce(new.rater_id, new.from_user_id);
  new.from_user_id := coalesce(new.from_user_id, new.rater_id);

  new.rated_user_id := coalesce(new.rated_user_id, new.to_user_id);
  new.to_user_id := coalesce(new.to_user_id, new.rated_user_id);

  return new;
end;
$$;

create or replace function public.sync_report_compatibility()
returns trigger
language plpgsql
as $$
begin
  new.reporter_id := coalesce(new.reporter_id, new.reporter_user_id);
  new.reporter_user_id := coalesce(new.reporter_user_id, new.reporter_id);

  new.reported_user_id := coalesce(new.reported_user_id, new.target_user_id);
  new.target_user_id := coalesce(new.target_user_id, new.reported_user_id);

  return new;
end;
$$;

create or replace function public.sync_private_contact_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.private_contacts (user_id, phone)
  values (new.id, coalesce(new.phone, ''))
  on conflict (user_id) do update
    set phone = excluded.phone,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_sync_compatibility_trigger
before insert or update on public.profiles
for each row execute function public.sync_profile_compatibility();

create trigger traveler_profiles_updated_at
before update on public.traveler_profiles
for each row execute function public.set_updated_at();

create trigger trips_sync_compatibility_trigger
before insert or update on public.trips
for each row execute function public.sync_trip_compatibility();

create trigger parcels_sync_compatibility_trigger
before insert or update on public.parcel_requests
for each row execute function public.sync_parcel_compatibility();

create trigger deals_sync_compatibility_trigger
before insert or update on public.deals
for each row execute function public.sync_deal_compatibility();

create trigger ratings_sync_compatibility_trigger
before insert or update on public.ratings
for each row execute function public.sync_rating_compatibility();

create trigger reports_sync_compatibility_trigger
before insert or update on public.reports
for each row execute function public.sync_report_compatibility();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trips_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

create trigger parcel_requests_updated_at
before update on public.parcel_requests
for each row execute function public.set_updated_at();

create trigger deals_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

create trigger user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger sync_private_contacts_from_profiles_trigger
after insert or update of phone on public.profiles
for each row execute function public.sync_private_contact_from_profile();

-- ---------------------------------------------------------------------------
-- Helper + RPC functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin_user(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_user, auth.uid())
      and p.is_admin = true
  );
$$;

create or replace function public.is_deal_participant(p_deal_id uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deals d
    where d.id = p_deal_id
      and (d.sender_id = coalesce(p_user, auth.uid()) or d.traveler_id = coalesce(p_user, auth.uid()))
  );
$$;

create or replace function public.can_view_phone(p_target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    auth.uid() = p_target_user
    or public.is_admin_user(auth.uid())
    or exists (
      select 1
      from public.deals d
      where d.status in ('mutually_accepted', 'picked_up', 'delivered_confirmed', 'closed')
        and (
          (d.sender_id = auth.uid() and d.traveler_id = p_target_user)
          or
          (d.traveler_id = auth.uid() and d.sender_id = p_target_user)
        )
    )
  );
$$;

create or replace function public.generate_delivery_code_value()
returns text
language plpgsql
as $$
declare
  num_part text;
  alpha_part text;
begin
  num_part := lpad((floor(random() * 10000))::int::text, 4, '0');
  alpha_part := chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
  return 'MAAK-' || num_part || '-' || alpha_part;
end;
$$;

create or replace function public.has_active_deal(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.deals d
    where (d.sender_id = p_user_id or d.traveler_id = p_user_id)
      and d.status in (
        'proposed',
        'accepted_by_sender',
        'accepted_by_traveler',
        'mutually_accepted',
        'picked_up',
        'delivered_confirmed'
      )
  );
$$;

create or replace function public.has_active_deal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_active_deal(auth.uid());
$$;

create or replace function public.expire_marketplace_records()
returns table(expired_trips integer, expired_parcels integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_trips integer := 0;
  v_expired_parcels integer := 0;
begin
  update public.trips
  set status = 'expired',
      updated_at = timezone('utc', now())
  where status = 'active'
    and departure_time < timezone('utc', now());
  get diagnostics v_expired_trips = row_count;

  update public.parcel_requests
  set status = 'expired',
      updated_at = timezone('utc', now())
  where status in ('open', 'matched')
    and time_window_end is not null
    and time_window_end < timezone('utc', now());
  get diagnostics v_expired_parcels = row_count;

  return query select v_expired_trips, v_expired_parcels;
end;
$$;

create or replace function public.recompute_deal_status(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
  v_new_status text;
begin
  select * into d
  from public.deals
  where id = p_deal_id
  for update;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if d.status in ('picked_up', 'delivered_confirmed', 'closed', 'cancelled') then
    return d;
  end if;

  if d.sender_accepted_at is not null
     and d.traveler_accepted_at is not null
     and nullif(trim(coalesce(d.pickup_place, '')), '') is not null
     and nullif(trim(coalesce(d.dropoff_place, '')), '') is not null then
    v_new_status := 'mutually_accepted';
  elsif d.sender_accepted_at is not null and d.traveler_accepted_at is null then
    v_new_status := 'accepted_by_sender';
  elsif d.traveler_accepted_at is not null and d.sender_accepted_at is null then
    v_new_status := 'accepted_by_traveler';
  else
    v_new_status := 'proposed';
  end if;

  update public.deals
  set status = v_new_status,
      accepted_at = case when v_new_status = 'mutually_accepted' then coalesce(accepted_at, timezone('utc', now())) else accepted_at end,
      updated_at = timezone('utc', now())
  where id = p_deal_id
  returning * into d;

  if v_new_status = 'mutually_accepted' then
    update public.parcel_requests
    set status = 'matched',
        updated_at = timezone('utc', now())
    where id = d.parcel_id
      and status in ('open', 'matched');
  end if;

  return d;
end;
$$;

create or replace function public.propose_deal(
  p_trip_id uuid,
  p_parcel_request_id uuid
)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.trips;
  p public.parcel_requests;
  d public.deals;
begin
  perform public.expire_marketplace_records();

  select * into t
  from public.trips
  where id = p_trip_id
    and status = 'active';

  if t.id is null then
    raise exception 'Trajet indisponible';
  end if;

  select * into p
  from public.parcel_requests
  where id = p_parcel_request_id
    and status in ('open', 'matched');

  if p.id is null then
    raise exception 'Colis indisponible';
  end if;

  if t.traveler_id = p.sender_id then
    raise exception 'Deal impossible avec soi-même';
  end if;

  if auth.uid() not in (t.traveler_id, p.sender_id) then
    raise exception 'Non autorisé';
  end if;

  if public.has_active_deal(t.traveler_id) then
    raise exception 'Le voyageur a déjà un deal actif';
  end if;

  if public.has_active_deal(p.sender_id) then
    raise exception 'L''expéditeur a déjà un deal actif';
  end if;

  insert into public.deals (
    trip_id,
    parcel_id,
    sender_id,
    traveler_id,
    status
  )
  values (
    t.id,
    p.id,
    p.sender_id,
    t.traveler_id,
    'proposed'
  )
  returning * into d;

  return d;
end;
$$;

create or replace function public.set_pickup_place(
  p_deal_id uuid,
  p_pickup_place text
)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
begin
  select * into d
  from public.deals
  where id = p_deal_id;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if auth.uid() <> d.traveler_id then
    raise exception 'Seul le voyageur peut définir le point A';
  end if;

  update public.deals
  set pickup_place = nullif(trim(p_pickup_place), ''),
      updated_at = timezone('utc', now())
  where id = p_deal_id;

  return public.recompute_deal_status(p_deal_id);
end;
$$;

create or replace function public.set_dropoff_place(
  p_deal_id uuid,
  p_dropoff_place text
)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
  v_dropoff text;
begin
  select * into d
  from public.deals
  where id = p_deal_id;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if auth.uid() <> d.sender_id then
    raise exception 'Seul l''expéditeur peut définir le point B';
  end if;

  v_dropoff := nullif(trim(p_dropoff_place), '');

  update public.deals
  set dropoff_place = v_dropoff,
      updated_at = timezone('utc', now())
  where id = p_deal_id;

  update public.parcel_requests
  set dropoff_place = v_dropoff,
      delivery_point_address = v_dropoff,
      updated_at = timezone('utc', now())
  where id = d.parcel_id;

  return public.recompute_deal_status(p_deal_id);
end;
$$;

create or replace function public.accept_deal(p_deal_id uuid)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
begin
  select * into d
  from public.deals
  where id = p_deal_id
  for update;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if auth.uid() not in (d.sender_id, d.traveler_id) then
    raise exception 'Non autorisé';
  end if;

  if d.status in ('picked_up', 'delivered_confirmed', 'closed', 'cancelled') then
    raise exception 'Ce deal ne peut plus être accepté';
  end if;

  if auth.uid() = d.sender_id then
    update public.deals
    set sender_accepted_at = coalesce(sender_accepted_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = p_deal_id;
  else
    update public.deals
    set traveler_accepted_at = coalesce(traveler_accepted_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where id = p_deal_id;
  end if;

  return public.recompute_deal_status(p_deal_id);
end;
$$;

-- Compatibility wrapper for old frontend payload (pickup can be set through dedicated RPC)
create or replace function public.accept_deal(
  p_deal_id uuid,
  p_pickup_point_address text
)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pickup_point_address is not null and nullif(trim(p_pickup_point_address), '') is not null then
    perform public.set_pickup_place(p_deal_id, p_pickup_point_address);
  end if;

  return public.accept_deal(p_deal_id);
end;
$$;

create or replace function public.confirm_pickup(
  p_deal_id uuid,
  p_content_ok boolean default true,
  p_size_ok boolean default true,
  p_photo_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
  v_photo_url text;
begin
  select * into d
  from public.deals
  where id = p_deal_id
  for update;

  if d.id is null then
    return false;
  end if;

  if auth.uid() <> d.traveler_id then
    return false;
  end if;

  if d.status <> 'mutually_accepted' then
    return false;
  end if;

  v_photo_url := coalesce(nullif(trim(p_photo_url), ''), 'fonction-a-venir://pickup-proof');

  update public.deals
  set status = 'picked_up',
      pickup_confirmed_at = coalesce(pickup_confirmed_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where id = p_deal_id;

  update public.parcel_requests
  set status = 'in_transit',
      updated_at = timezone('utc', now())
  where id = d.parcel_id
    and status in ('matched', 'open', 'in_transit');

  insert into public.handoff_proofs (deal_id, type, photo_url, created_by)
  values (p_deal_id, 'pickup', v_photo_url, auth.uid());

  return true;
end;
$$;

create or replace function public.issue_delivery_code_for_sender(
  p_deal_id uuid
)
returns table(code text, code_last4 text)
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
  generated_code text;
begin
  select * into d
  from public.deals
  where id = p_deal_id;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if auth.uid() <> d.sender_id and not public.is_admin_user(auth.uid()) then
    raise exception 'Non autorisé';
  end if;

  if d.status not in ('mutually_accepted', 'picked_up') then
    raise exception 'Code indisponible pour ce statut';
  end if;

  generated_code := public.generate_delivery_code_value();

  insert into public.delivery_codes (deal_id, code_hash, code_last4, created_by, consumed_at, consumed_by)
  values (
    d.id,
    crypt(generated_code, gen_salt('bf')),
    right(generated_code, 4),
    d.sender_id,
    null,
    null
  )
  on conflict (deal_id) do update
    set code_hash = excluded.code_hash,
        code_last4 = excluded.code_last4,
        created_by = excluded.created_by,
        created_at = timezone('utc', now()),
        consumed_at = null,
        consumed_by = null;

  return query select generated_code, right(generated_code, 4);
end;
$$;

-- Compatibility alias used by current UI
create or replace function public.issue_delivery_code_for_owner(
  p_deal_id uuid
)
returns table(code text, code_last4 text)
language sql
security definer
set search_path = public
as $$
  select * from public.issue_delivery_code_for_sender(p_deal_id);
$$;

create or replace function public.verify_delivery_code(
  p_deal_id uuid,
  p_code text
)
returns table(success boolean, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
  dc public.delivery_codes;
begin
  select * into d
  from public.deals
  where id = p_deal_id
  for update;

  if d.id is null then
    return query select false, 'Deal introuvable';
    return;
  end if;

  if auth.uid() <> d.traveler_id then
    return query select false, 'Non autorisé';
    return;
  end if;

  if d.status not in ('picked_up', 'mutually_accepted') then
    return query select false, 'Statut invalide pour la livraison';
    return;
  end if;

  select * into dc
  from public.delivery_codes
  where deal_id = p_deal_id;

  if dc.deal_id is null then
    return query select false, 'Code non disponible';
    return;
  end if;

  if dc.consumed_at is not null then
    return query select false, 'Code déjà utilisé';
    return;
  end if;

  if crypt(p_code, dc.code_hash) <> dc.code_hash then
    return query select false, 'Code incorrect. Livraison non confirmée.';
    return;
  end if;

  update public.delivery_codes
  set consumed_at = timezone('utc', now()),
      consumed_by = auth.uid()
  where deal_id = p_deal_id;

  update public.deals
  set status = 'delivered_confirmed',
      delivered_confirmed_at = coalesce(delivered_confirmed_at, timezone('utc', now())),
      payment_status = 'released',
      updated_at = timezone('utc', now())
  where id = p_deal_id;

  update public.parcel_requests
  set status = 'delivered',
      updated_at = timezone('utc', now())
  where id = d.parcel_id
    and status in ('in_transit', 'matched', 'open', 'delivered');

  return query select true, 'Livraison confirmée ✅';
end;
$$;

create or replace function public.close_deal(
  p_deal_id uuid
)
returns public.deals
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.deals;
begin
  select * into d
  from public.deals
  where id = p_deal_id;

  if d.id is null then
    raise exception 'Deal introuvable';
  end if;

  if auth.uid() not in (d.sender_id, d.traveler_id) and not public.is_admin_user(auth.uid()) then
    raise exception 'Non autorisé';
  end if;

  if d.status = 'cancelled' then
    return d;
  end if;

  update public.deals
  set status = 'closed',
      closed_at = coalesce(closed_at, timezone('utc', now())),
      updated_at = timezone('utc', now())
  where id = p_deal_id
  returning * into d;

  return d;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_full_name text;
  v_phone text;
  v_role text;
  v_lang text;
  v_wilaya_code integer;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_phone := nullif(trim(coalesce(new.raw_user_meta_data->>'phone', new.phone, '')), '');

  v_role := case
    when new.raw_user_meta_data->>'role' in ('sender', 'traveler', 'both', 'admin') then new.raw_user_meta_data->>'role'
    when new.raw_user_meta_data->>'role_preference' = 'traveler' then 'traveler'
    when new.raw_user_meta_data->>'role_preference' in ('owner', 'sender') then 'sender'
    when new.raw_user_meta_data->>'role_preference' = 'admin' then 'admin'
    else 'both'
  end;

  v_lang := case
    when new.raw_user_meta_data->>'language_preference' = 'ar' then 'ar'
    when new.raw_user_meta_data->>'preferred_language' = 'ar' then 'ar'
    else 'fr'
  end;

  v_wilaya_code := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'wilaya_code', ''), '[^0-9]', '', 'g'), '')::integer;

  insert into public.profiles (
    id,
    user_id,
    full_name,
    name,
    phone,
    role,
    role_preference,
    wilaya_code,
    language_preference,
    profile_complete
  )
  values (
    new.id,
    new.id,
    case when v_full_name = '' then 'Utilisateur MAAK' else v_full_name end,
    case when v_full_name = '' then 'Utilisateur MAAK' else v_full_name end,
    v_phone,
    v_role,
    case
      when v_role = 'sender' then 'sender'
      when v_role = 'traveler' then 'traveler'
      else 'both'
    end,
    case when v_wilaya_code between 1 and 58 then v_wilaya_code else null end,
    v_lang,
    false
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        name = excluded.name,
        phone = excluded.phone,
        role = excluded.role,
        role_preference = excluded.role_preference,
        wilaya_code = excluded.wilaya_code,
        language_preference = excluded.language_preference,
        updated_at = timezone('utc', now());

  insert into public.private_contacts (user_id, phone)
  values (new.id, coalesce(v_phone, ''))
  on conflict (user_id) do update
    set phone = excluded.phone,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

create or replace function public.ensure_delivery_code_hash_on_mutual_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
begin
  if new.status = 'mutually_accepted' and old.status is distinct from new.status then
    generated_code := public.generate_delivery_code_value();

    insert into public.delivery_codes (deal_id, code_hash, code_last4, created_by)
    values (
      new.id,
      crypt(generated_code, gen_salt('bf')),
      right(generated_code, 4),
      new.sender_id
    )
    on conflict (deal_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function public.log_deal_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.deal_events (deal_id, actor_id, event_type, from_status, to_status, metadata)
    values (
      new.id,
      coalesce(auth.uid(), new.sender_id),
      'status_changed',
      old.status,
      new.status,
      jsonb_build_object('updated_at', timezone('utc', now()))
    );
  end if;

  return new;
end;
$$;

create or replace function public.enforce_single_active_deal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in (
    'proposed',
    'accepted_by_sender',
    'accepted_by_traveler',
    'mutually_accepted',
    'picked_up',
    'delivered_confirmed'
  ) then
    if exists (
      select 1
      from public.deals d
      where d.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and d.status in (
          'proposed',
          'accepted_by_sender',
          'accepted_by_traveler',
          'mutually_accepted',
          'picked_up',
          'delivered_confirmed'
        )
        and (
          d.sender_id in (new.sender_id, new.traveler_id)
          or d.traveler_id in (new.sender_id, new.traveler_id)
        )
    ) then
      raise exception 'Action bloquée: un deal actif existe déjà pour un participant';
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger deals_active_lock_trigger
before insert or update on public.deals
for each row execute function public.enforce_single_active_deal();

create trigger deals_generate_code_trigger
after update on public.deals
for each row execute function public.ensure_delivery_code_hash_on_mutual_accept();

create trigger deals_status_event_trigger
after update of status on public.deals
for each row execute function public.log_deal_status_event();

-- Optional scheduler note for auto-expiry:
-- If pg_cron is enabled, schedule:
-- select cron.schedule('maak_expire_marketplace', '*/10 * * * *', $$select public.expire_marketplace_records();$$);

-- ---------------------------------------------------------------------------
-- Public view for safe profile browsing
-- ---------------------------------------------------------------------------

create or replace view public.profile_public as
select
  p.id as user_id,
  p.full_name,
  p.wilaya_code,
  p.language_preference,
  p.rating_avg,
  p.completed_count
from public.profiles p;

grant select on public.profile_public to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.traveler_profiles enable row level security;
alter table public.trips enable row level security;
alter table public.parcel_requests enable row level security;
alter table public.deals enable row level security;
alter table public.messages enable row level security;
alter table public.deal_events enable row level security;
alter table public.ratings enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.delivery_codes enable row level security;
alter table public.handoff_proofs enable row level security;
alter table public.private_contacts enable row level security;
alter table public.user_settings enable row level security;

-- Profiles
drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.is_admin_user(auth.uid())
  or public.can_view_phone(id)
);

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Traveler profiles
drop policy if exists traveler_profiles_select_auth on public.traveler_profiles;
create policy traveler_profiles_select_auth
on public.traveler_profiles
for select
to authenticated
using (true);

drop policy if exists traveler_profiles_insert_self on public.traveler_profiles;
create policy traveler_profiles_insert_self
on public.traveler_profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists traveler_profiles_update_self on public.traveler_profiles;
create policy traveler_profiles_update_self
on public.traveler_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Trips
drop policy if exists trips_select_active_or_owner on public.trips;
create policy trips_select_active_or_owner
on public.trips
for select
to authenticated
using (
  status = 'active'
  or traveler_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists trips_insert_owner on public.trips;
create policy trips_insert_owner
on public.trips
for insert
to authenticated
with check (traveler_id = auth.uid());

drop policy if exists trips_update_owner on public.trips;
create policy trips_update_owner
on public.trips
for update
to authenticated
using (traveler_id = auth.uid() or public.is_admin_user(auth.uid()))
with check (traveler_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists trips_delete_owner on public.trips;
create policy trips_delete_owner
on public.trips
for delete
to authenticated
using (traveler_id = auth.uid() or public.is_admin_user(auth.uid()));

-- Parcel requests
drop policy if exists parcels_select_open_or_owner on public.parcel_requests;
create policy parcels_select_open_or_owner
on public.parcel_requests
for select
to authenticated
using (
  status = 'open'
  or sender_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists parcels_insert_owner on public.parcel_requests;
create policy parcels_insert_owner
on public.parcel_requests
for insert
to authenticated
with check (sender_id = auth.uid());

drop policy if exists parcels_update_owner on public.parcel_requests;
create policy parcels_update_owner
on public.parcel_requests
for update
to authenticated
using (sender_id = auth.uid() or public.is_admin_user(auth.uid()))
with check (sender_id = auth.uid() or public.is_admin_user(auth.uid()));

drop policy if exists parcels_delete_owner on public.parcel_requests;
create policy parcels_delete_owner
on public.parcel_requests
for delete
to authenticated
using (sender_id = auth.uid() or public.is_admin_user(auth.uid()));

-- Deals (raw writes blocked, managed by RPC)
drop policy if exists deals_select_participants on public.deals;
create policy deals_select_participants
on public.deals
for select
to authenticated
using (
  sender_id = auth.uid()
  or traveler_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists deals_no_direct_insert on public.deals;
create policy deals_no_direct_insert
on public.deals
for insert
to authenticated
with check (false);

drop policy if exists deals_no_direct_update on public.deals;
create policy deals_no_direct_update
on public.deals
for update
to authenticated
using (false)
with check (false);

drop policy if exists deals_no_direct_delete on public.deals;
create policy deals_no_direct_delete
on public.deals
for delete
to authenticated
using (false);

-- Messages
-- Chat allowed only after mutually accepted
drop policy if exists messages_select_participants_unlocked on public.messages;
create policy messages_select_participants_unlocked
on public.messages
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.id = messages.deal_id
      and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
      and d.status in ('mutually_accepted', 'picked_up', 'delivered_confirmed', 'closed')
  )
);

drop policy if exists messages_insert_participants_unlocked on public.messages;
create policy messages_insert_participants_unlocked
on public.messages
for insert
to authenticated
with check (
  (public.is_admin_user(auth.uid()) and sender_id = auth.uid())
  or (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.deals d
      where d.id = messages.deal_id
        and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
        and d.status in ('mutually_accepted', 'picked_up', 'delivered_confirmed', 'closed')
    )
  )
);

-- Deal events
drop policy if exists deal_events_select_participants on public.deal_events;
create policy deal_events_select_participants
on public.deal_events
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.id = deal_events.deal_id
      and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
  )
);

drop policy if exists deal_events_no_direct_insert on public.deal_events;
create policy deal_events_no_direct_insert
on public.deal_events
for insert
to authenticated
with check (false);

-- Ratings
drop policy if exists ratings_select_owner_or_admin on public.ratings;
create policy ratings_select_owner_or_admin
on public.ratings
for select
to authenticated
using (
  rater_id = auth.uid()
  or rated_user_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists ratings_insert_guarded on public.ratings;
create policy ratings_insert_guarded
on public.ratings
for insert
to authenticated
with check (
  rater_id = auth.uid()
  and rater_id <> rated_user_id
  and exists (
    select 1
    from public.deals d
    where d.id = ratings.deal_id
      and d.status in ('delivered_confirmed', 'closed')
      and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
  )
);

-- Reports
drop policy if exists reports_select_reporter_or_admin on public.reports;
create policy reports_select_reporter_or_admin
on public.reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists reports_insert_reporter on public.reports;
create policy reports_insert_reporter
on public.reports
for insert
to authenticated
with check (
  reporter_id = auth.uid()
  and reporter_id <> reported_user_id
);

-- Blocked users
drop policy if exists blocked_users_select_self on public.blocked_users;
create policy blocked_users_select_self
on public.blocked_users
for select
to authenticated
using (
  blocker_user_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

drop policy if exists blocked_users_insert_self on public.blocked_users;
create policy blocked_users_insert_self
on public.blocked_users
for insert
to authenticated
with check (
  blocker_user_id = auth.uid()
  and blocker_user_id <> blocked_user_id
);

drop policy if exists blocked_users_delete_self on public.blocked_users;
create policy blocked_users_delete_self
on public.blocked_users
for delete
to authenticated
using (
  blocker_user_id = auth.uid()
  or public.is_admin_user(auth.uid())
);

-- Delivery codes (traveler cannot read code)
drop policy if exists delivery_codes_select_sender_or_admin on public.delivery_codes;
create policy delivery_codes_select_sender_or_admin
on public.delivery_codes
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.id = delivery_codes.deal_id
      and d.sender_id = auth.uid()
  )
);

drop policy if exists delivery_codes_no_direct_insert on public.delivery_codes;
create policy delivery_codes_no_direct_insert
on public.delivery_codes
for insert
to authenticated
with check (false);

drop policy if exists delivery_codes_no_direct_update on public.delivery_codes;
create policy delivery_codes_no_direct_update
on public.delivery_codes
for update
to authenticated
using (false)
with check (false);

drop policy if exists delivery_codes_no_direct_delete on public.delivery_codes;
create policy delivery_codes_no_direct_delete
on public.delivery_codes
for delete
to authenticated
using (false);

-- Handoff proofs
drop policy if exists handoff_proofs_select_participants on public.handoff_proofs;
create policy handoff_proofs_select_participants
on public.handoff_proofs
for select
to authenticated
using (
  public.is_admin_user(auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.id = handoff_proofs.deal_id
      and (d.sender_id = auth.uid() or d.traveler_id = auth.uid())
  )
);

drop policy if exists handoff_proofs_insert_traveler on public.handoff_proofs;
create policy handoff_proofs_insert_traveler
on public.handoff_proofs
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.deals d
    where d.id = handoff_proofs.deal_id
      and d.traveler_id = auth.uid()
      and d.status in ('mutually_accepted', 'picked_up', 'delivered_confirmed')
  )
);

-- Private contacts
-- Progressive contact gating: visible only to self/admin/participants after mutual acceptance
drop policy if exists private_contacts_select_guarded on public.private_contacts;
create policy private_contacts_select_guarded
on public.private_contacts
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
  or exists (
    select 1
    from public.deals d
    where d.status in ('mutually_accepted', 'picked_up', 'delivered_confirmed', 'closed')
      and (
        (d.sender_id = auth.uid() and d.traveler_id = private_contacts.user_id)
        or
        (d.traveler_id = auth.uid() and d.sender_id = private_contacts.user_id)
      )
  )
);

drop policy if exists private_contacts_insert_self on public.private_contacts;
create policy private_contacts_insert_self
on public.private_contacts
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));

drop policy if exists private_contacts_update_self on public.private_contacts;
create policy private_contacts_update_self
on public.private_contacts
for update
to authenticated
using (auth.uid() = user_id or public.is_admin_user(auth.uid()))
with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));

-- User settings
drop policy if exists user_settings_select_self on public.user_settings;
create policy user_settings_select_self
on public.user_settings
for select
to authenticated
using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

drop policy if exists user_settings_insert_self on public.user_settings;
create policy user_settings_insert_self
on public.user_settings
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));

drop policy if exists user_settings_update_self on public.user_settings;
create policy user_settings_update_self
on public.user_settings
for update
to authenticated
using (auth.uid() = user_id or public.is_admin_user(auth.uid()))
with check (auth.uid() = user_id or public.is_admin_user(auth.uid()));

-- ---------------------------------------------------------------------------
-- Admin RPC (for existing admin frontend)
-- ---------------------------------------------------------------------------

create or replace function public.admin_assert_is_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'Accès administrateur requis';
  end if;
end;
$$;

create or replace function public.admin_get_stats()
returns table(
  total_auth_users bigint,
  total_profiles bigint,
  total_trips bigint,
  total_parcels bigint,
  total_deals bigint,
  total_messages bigint,
  deals_proposed bigint,
  deals_accepted_by_sender bigint,
  deals_accepted_by_traveler bigint,
  deals_mutually_accepted bigint,
  deals_pickup_confirmed bigint,
  deals_delivered bigint,
  deals_closed bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select
    (select count(*) from auth.users),
    (select count(*) from public.profiles),
    (select count(*) from public.trips),
    (select count(*) from public.parcel_requests),
    (select count(*) from public.deals),
    (select count(*) from public.messages),
    (select count(*) from public.deals where status = 'proposed'),
    (select count(*) from public.deals where status = 'accepted_by_sender'),
    (select count(*) from public.deals where status = 'accepted_by_traveler'),
    (select count(*) from public.deals where status = 'mutually_accepted'),
    (select count(*) from public.deals where status = 'picked_up'),
    (select count(*) from public.deals where status = 'delivered_confirmed'),
    (select count(*) from public.deals where status = 'closed');
end;
$$;

create or replace function public.admin_get_users(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table(
  user_id uuid,
  email text,
  created_at timestamptz,
  email_confirmed boolean,
  profile_complete boolean,
  wilaya text,
  is_admin boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select
    u.id,
    u.email,
    u.created_at,
    (u.email_confirmed_at is not null) as email_confirmed,
    coalesce(p.profile_complete, false) as profile_complete,
    case
      when p.wilaya_code is null then null
      else lpad(p.wilaya_code::text, 2, '0')
    end as wilaya,
    coalesce(p.is_admin, false) as is_admin
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_get_trips(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table(
  id uuid,
  origin_wilaya integer,
  destination_wilaya integer,
  departure_date timestamptz,
  status text,
  user_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select t.id, t.origin_wilaya, t.destination_wilaya, t.departure_time as departure_date, t.status, t.traveler_id as user_id, t.created_at
  from public.trips t
  order by t.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_get_parcels(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table(
  id uuid,
  origin_wilaya integer,
  destination_wilaya integer,
  status text,
  user_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select p.id, p.origin_wilaya, p.destination_wilaya, p.status, p.sender_id as user_id, p.created_at
  from public.parcel_requests p
  order by p.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_get_deals(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table(
  id uuid,
  status text,
  owner_user_id uuid,
  traveler_user_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select d.id, d.status, d.sender_id as owner_user_id, d.traveler_id as traveler_user_id, d.created_at
  from public.deals d
  order by d.created_at desc
  limit p_limit offset p_offset;
end;
$$;

create or replace function public.admin_get_messages(
  p_limit integer default 200,
  p_offset integer default 0
)
returns table(
  id uuid,
  deal_id uuid,
  sender_id uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_assert_is_admin();

  return query
  select m.id, m.deal_id, m.sender_id, m.created_at
  from public.messages m
  order by m.created_at desc
  limit p_limit offset p_offset;
end;
$$;

revoke all on function public.admin_assert_is_admin() from public;
revoke all on function public.admin_get_stats() from public;
revoke all on function public.admin_get_users(integer, integer) from public;
revoke all on function public.admin_get_trips(integer, integer) from public;
revoke all on function public.admin_get_parcels(integer, integer) from public;
revoke all on function public.admin_get_deals(integer, integer) from public;
revoke all on function public.admin_get_messages(integer, integer) from public;

-- ---------------------------------------------------------------------------
-- Grants for authenticated app role
-- ---------------------------------------------------------------------------

grant execute on function public.is_admin_user(uuid) to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.can_view_phone(uuid) to authenticated;
grant execute on function public.is_deal_participant(uuid, uuid) to authenticated;
grant execute on function public.has_active_deal(uuid) to authenticated;
grant execute on function public.has_active_deal() to authenticated;
grant execute on function public.expire_marketplace_records() to authenticated;
grant execute on function public.propose_deal(uuid, uuid) to authenticated;
grant execute on function public.accept_deal(uuid) to authenticated;
grant execute on function public.accept_deal(uuid, text) to authenticated;
grant execute on function public.set_pickup_place(uuid, text) to authenticated;
grant execute on function public.set_dropoff_place(uuid, text) to authenticated;
grant execute on function public.confirm_pickup(uuid, boolean, boolean, text) to authenticated;
grant execute on function public.issue_delivery_code_for_sender(uuid) to authenticated;
grant execute on function public.issue_delivery_code_for_owner(uuid) to authenticated;
grant execute on function public.verify_delivery_code(uuid, text) to authenticated;
grant execute on function public.close_deal(uuid) to authenticated;

grant execute on function public.admin_get_stats() to authenticated;
grant execute on function public.admin_get_users(integer, integer) to authenticated;
grant execute on function public.admin_get_trips(integer, integer) to authenticated;
grant execute on function public.admin_get_parcels(integer, integer) to authenticated;
grant execute on function public.admin_get_deals(integer, integer) to authenticated;
grant execute on function public.admin_get_messages(integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage buckets + policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('handoff_proofs', 'handoff_proofs', false)
on conflict (id) do nothing;

do $storage_policies$
begin
  execute 'alter table storage.objects enable row level security';

  -- avatars: user can read/write only inside own folder auth.uid()/...
  execute 'drop policy if exists "avatars_select_own_folder" on storage.objects';
  execute 'create policy "avatars_select_own_folder" on storage.objects for select to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text)';

  execute 'drop policy if exists "avatars_insert_own_folder" on storage.objects';
  execute 'create policy "avatars_insert_own_folder" on storage.objects for insert to authenticated with check (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text and owner = auth.uid())';

  execute 'drop policy if exists "avatars_update_own_folder" on storage.objects';
  execute 'create policy "avatars_update_own_folder" on storage.objects for update to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text and owner = auth.uid()) with check (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text and owner = auth.uid())';

  execute 'drop policy if exists "avatars_delete_own_folder" on storage.objects';
  execute 'create policy "avatars_delete_own_folder" on storage.objects for delete to authenticated using (bucket_id = ''avatars'' and (storage.foldername(name))[1] = auth.uid()::text and owner = auth.uid())';

  -- handoff proofs: traveler uploads pickup proof into {deal_id}/...,
  -- sender/traveler/admin can read
  execute 'drop policy if exists "handoff_select_participants" on storage.objects';
  execute '
    create policy "handoff_select_participants"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = ''handoff_proofs''
      and (
        public.is_admin_user(auth.uid())
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
        public.is_admin_user(auth.uid())
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
        public.is_admin_user(auth.uid())
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
        public.is_admin_user(auth.uid())
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
    raise notice 'Storage policy apply skipped (insufficient privilege). Configure in Storage -> Policies.';
  when undefined_table then
    raise notice 'storage.objects unavailable. Configure storage policies from dashboard.';
end;
$storage_policies$;

-- ---------------------------------------------------------------------------
-- Realtime publication
-- ---------------------------------------------------------------------------

do $realtime$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      execute 'alter publication supabase_realtime add table public.messages';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'deals'
    ) then
      execute 'alter publication supabase_realtime add table public.deals';
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'parcel_requests'
    ) then
      execute 'alter publication supabase_realtime add table public.parcel_requests';
    end if;
  else
    raise notice 'Publication supabase_realtime not found. Enable Realtime in dashboard.';
  end if;
exception
  when insufficient_privilege then
    raise notice 'Realtime publication update skipped (insufficient privilege).';
end;
$realtime$;

-- ============================================================================
-- End of MAAK_SETUP.sql
-- ============================================================================
