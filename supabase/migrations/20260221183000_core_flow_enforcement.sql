-- Core flow enforcement for MAAK marketplace
-- Enforces:
-- 1) strict bilateral acceptance
-- 2) pickup/dropoff handoff lifecycle
-- 3) secret delivery code hashing
-- 4) DB-level transition checks + order event logging
-- 5) realtime notifications + chat/phone gating by status

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Schema alignment (non-destructive)
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS traveler_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS departure_time timestamptz,
  ADD COLUMN IF NOT EXISTS capacity text,
  ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}';

ALTER TABLE public.parcel_requests
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS dropoff_place_text text,
  ADD COLUMN IF NOT EXISTS dropoff_place_type text,
  ADD COLUMN IF NOT EXISTS pickup_radius_km numeric,
  ADD COLUMN IF NOT EXISTS pickup_area_text text,
  ADD COLUMN IF NOT EXISTS pickup_center_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_center_lng double precision,
  ADD COLUMN IF NOT EXISTS declared_content text,
  ADD COLUMN IF NOT EXISTS forbidden_ack boolean DEFAULT false;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS traveler_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parcel_id uuid REFERENCES public.parcel_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_place text,
  ADD COLUMN IF NOT EXISTS pickup_point_address text,
  ADD COLUMN IF NOT EXISTS pickup_point_type text,
  ADD COLUMN IF NOT EXISTS pickup_point_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS dropoff_place text,
  ADD COLUMN IF NOT EXISTS delivery_place_text text,
  ADD COLUMN IF NOT EXISTS dropoff_point_type text,
  ADD COLUMN IF NOT EXISTS dropoff_point_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS mutual_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_place_text text,
  ADD COLUMN IF NOT EXISTS pickup_place_type text,
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lng double precision,
  ADD COLUMN IF NOT EXISTS pickup_location_selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS traveler_confirmed_pickup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS traveler_confirmed_delivery boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_confirmed_pickup boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_confirmed_delivery boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS secret_code_hash text,
  ADD COLUMN IF NOT EXISTS secret_code_last4 text,
  ADD COLUMN IF NOT EXISTS secret_code_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS secret_code_consumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS mutual_acceptance_actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS status_updated_at timestamptz DEFAULT timezone('utc', now());

CREATE TABLE IF NOT EXISTS public.private_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.deal_delivery_codes (
  deal_id uuid PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  code_plain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_delivery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_delivery_codes_owner_read ON public.deal_delivery_codes;
DROP POLICY IF EXISTS "Owner can view delivery code" ON public.deal_delivery_codes;
CREATE POLICY deal_delivery_codes_owner_read
  ON public.deal_delivery_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_delivery_codes.deal_id
        AND auth.uid() = COALESCE(d.sender_id, d.owner_user_id)
    )
  );

CREATE TABLE IF NOT EXISTS public.handoff_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pickup', 'delivery')),
  photo_url text NOT NULL,
  checklist_content_ok boolean,
  checklist_size_ok boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.handoff_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS handoff_proofs_participants_read ON public.handoff_proofs;
DROP POLICY IF EXISTS "Deal participants can view handoff proofs" ON public.handoff_proofs;
CREATE POLICY handoff_proofs_participants_read
  ON public.handoff_proofs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = handoff_proofs.deal_id
        AND auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
    )
  );

DROP POLICY IF EXISTS handoff_proofs_participants_insert ON public.handoff_proofs;
DROP POLICY IF EXISTS "Deal participants can create handoff proofs" ON public.handoff_proofs;
CREATE POLICY handoff_proofs_participants_insert
  ON public.handoff_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = handoff_proofs.deal_id
        AND auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
    )
  );

UPDATE public.trips
SET departure_time = COALESCE(departure_time, departure_date),
    capacity = COALESCE(NULLIF(TRIM(capacity), ''), capacity_note),
    categories = COALESCE(categories, accepted_categories, '{}')
WHERE departure_time IS NULL
   OR capacity IS NULL
   OR categories IS NULL;

UPDATE public.parcel_requests
SET sender_id = COALESCE(sender_id, user_id),
    dropoff_place_text = COALESCE(dropoff_place_text, dropoff_place, delivery_point_address),
    dropoff_place_type = COALESCE(dropoff_place_type, delivery_point_type),
    declared_content = COALESCE(NULLIF(TRIM(declared_content), ''), NULLIF(TRIM(notes), '')),
    forbidden_ack = COALESCE(forbidden_ack, forbidden_items_acknowledged, false),
    pickup_area_text = COALESCE(pickup_area_text, 'Zone à préciser')
WHERE sender_id IS NULL
   OR dropoff_place_text IS NULL
   OR dropoff_place_type IS NULL
   OR declared_content IS NULL
   OR (pickup_radius_km IS NULL AND pickup_area_text IS NULL);

UPDATE public.deals
SET sender_id = COALESCE(sender_id, owner_user_id),
    traveler_id = COALESCE(traveler_id, traveler_user_id),
    parcel_id = COALESCE(parcel_id, parcel_request_id),
    pickup_place_text = COALESCE(pickup_place_text, pickup_place, pickup_point_address),
    pickup_place_type = COALESCE(pickup_place_type, pickup_point_type),
    mutual_accepted_at = COALESCE(mutual_accepted_at, accepted_at),
    status = CASE
      WHEN status = 'accepted' THEN 'mutually_accepted'
      WHEN status = 'pickup_confirmed' THEN 'pickup_location_confirmed'
      WHEN status = 'delivered_confirmed' THEN 'delivered'
      ELSE status
    END
WHERE sender_id IS NULL
   OR traveler_id IS NULL
   OR parcel_id IS NULL
   OR pickup_place_text IS NULL
   OR pickup_place_type IS NULL
   OR status IN ('accepted', 'pickup_confirmed', 'delivered_confirmed');

UPDATE public.deals
SET accepted_at = COALESCE(accepted_at, mutual_accepted_at)
WHERE status = 'mutually_accepted' AND accepted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Status + point type constraints
-- -----------------------------------------------------------------------------
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (
    status IN (
      'proposed',
      'accepted_by_traveler',
      'accepted_by_sender',
      'mutually_accepted',
      'pickup_location_selected',
      'pickup_location_confirmed',
      'picked_up',
      'in_transit',
      'delivered',
      'closed',
      'cancelled',
      'expired'
    )
  );

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_dropoff_place_type_check;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_requests_dropoff_place_type_check
  CHECK (
    dropoff_place_type IS NULL
    OR dropoff_place_type IN ('public', 'office', 'airport', 'train', 'other', 'public_place', 'delivery_office', 'train_station', 'bus_station')
  );

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_pickup_place_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_pickup_place_type_check
  CHECK (
    pickup_place_type IS NULL
    OR pickup_place_type IN ('public', 'office', 'airport', 'train', 'other', 'public_place', 'delivery_office', 'train_station', 'bus_station')
  );

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_pickup_pref_required_check;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_requests_pickup_pref_required_check
  CHECK (
    pickup_radius_km IS NOT NULL
    OR NULLIF(TRIM(COALESCE(pickup_area_text, '')), '') IS NOT NULL
  ) NOT VALID;

-- -----------------------------------------------------------------------------
-- Utility functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_handoff_point_type(p_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type text;
BEGIN
  v_type := NULLIF(TRIM(COALESCE(p_type, '')), '');
  IF v_type IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_type = 'public_place' THEN RETURN 'public'; END IF;
  IF v_type = 'delivery_office' THEN RETURN 'office'; END IF;
  IF v_type IN ('train_station', 'bus_station') THEN RETURN 'train'; END IF;

  IF v_type IN ('public', 'office', 'airport', 'train', 'other') THEN
    RETURN v_type;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.deal_status_rank(p_status text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_status
    WHEN 'proposed' THEN 10
    WHEN 'accepted_by_sender' THEN 20
    WHEN 'accepted_by_traveler' THEN 30
    WHEN 'mutually_accepted' THEN 40
    WHEN 'pickup_location_selected' THEN 50
    WHEN 'pickup_location_confirmed' THEN 60
    WHEN 'picked_up' THEN 70
    WHEN 'in_transit' THEN 80
    WHEN 'delivered' THEN 90
    WHEN 'closed' THEN 100
    WHEN 'cancelled' THEN -10
    WHEN 'expired' THEN -20
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.generate_secret_delivery_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_num text;
  v_alpha text;
BEGIN
  v_num := lpad((floor(random() * 10000))::int::text, 4, '0');
  v_alpha := chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
  RETURN 'MAAK-' || v_num || '-' || v_alpha;
END;
$$;

CREATE OR REPLACE FUNCTION public.distance_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * 6371 * asin(
    sqrt(
      power(sin(radians((p_lat2 - p_lat1) / 2)), 2)
      + cos(radians(p_lat1)) * cos(radians(p_lat2))
      * power(sin(radians((p_lng2 - p_lng1) / 2)), 2)
    )
  )
$$;

-- -----------------------------------------------------------------------------
-- Order events + notifications tables
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_events_participants_select ON public.order_events;
CREATE POLICY order_events_participants_select
  ON public.order_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = order_events.deal_id
        AND auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
    )
  );

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.push_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_deal_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, deal_id)
  VALUES (p_user_id, p_type, p_title, p_body, p_deal_id);
END;
$$;

-- -----------------------------------------------------------------------------
-- Sync + transition enforcement trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deals_before_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plain_code text;
  v_old text;
  v_new text;
BEGIN
  NEW.sender_id := COALESCE(NEW.sender_id, NEW.owner_user_id);
  NEW.traveler_id := COALESCE(NEW.traveler_id, NEW.traveler_user_id);
  NEW.owner_user_id := COALESCE(NEW.owner_user_id, NEW.sender_id);
  NEW.traveler_user_id := COALESCE(NEW.traveler_user_id, NEW.traveler_id);
  NEW.parcel_id := COALESCE(NEW.parcel_id, NEW.parcel_request_id);
  NEW.parcel_request_id := COALESCE(NEW.parcel_request_id, NEW.parcel_id);

  NEW.pickup_place_text := COALESCE(NEW.pickup_place_text, NEW.pickup_place, NEW.pickup_point_address);
  NEW.pickup_place := COALESCE(NEW.pickup_place, NEW.pickup_place_text);
  NEW.pickup_point_address := COALESCE(NEW.pickup_point_address, NEW.pickup_place_text);
  NEW.pickup_place_type := COALESCE(public.normalize_handoff_point_type(NEW.pickup_place_type), public.normalize_handoff_point_type(NEW.pickup_point_type));
  NEW.pickup_point_type := COALESCE(NEW.pickup_point_type, NEW.pickup_place_type);

  IF NEW.status = 'mutually_accepted' THEN
    NEW.accepted_at := COALESCE(NEW.accepted_at, now());
    NEW.mutual_accepted_at := COALESCE(NEW.mutual_accepted_at, now());
  END IF;

  IF NEW.status = 'pickup_location_selected' THEN
    NEW.pickup_location_selected_at := COALESCE(NEW.pickup_location_selected_at, now());
    NEW.pickup_point_set_at := COALESCE(NEW.pickup_point_set_at, now());
  END IF;

  IF NEW.status = 'pickup_location_confirmed' THEN
    NEW.pickup_confirmed_at := COALESCE(NEW.pickup_confirmed_at, now());
  END IF;

  IF NEW.status = 'delivered' THEN
    NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    NEW.delivery_confirmed_at := COALESCE(NEW.delivery_confirmed_at, NEW.delivered_at);
  END IF;

  IF NEW.status = 'closed' THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := COALESCE(NEW.updated_at, now());
    NEW.status_updated_at := now();
    RETURN NEW;
  END IF;

  v_old := COALESCE(OLD.status, '');
  v_new := COALESCE(NEW.status, '');

  NEW.updated_at := now();

  IF v_old IS DISTINCT FROM v_new THEN
    NEW.status_updated_at := now();

    IF v_old = 'proposed' AND v_new NOT IN ('accepted_by_traveler', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis proposed';
    ELSIF v_old = 'accepted_by_traveler' AND v_new NOT IN ('mutually_accepted', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis accepted_by_traveler';
    ELSIF v_old = 'accepted_by_sender' AND v_new NOT IN ('mutually_accepted', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis accepted_by_sender';
    ELSIF v_old = 'mutually_accepted' AND v_new NOT IN ('pickup_location_selected', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis mutually_accepted';
    ELSIF v_old = 'pickup_location_selected' AND v_new NOT IN ('pickup_location_confirmed', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis pickup_location_selected';
    ELSIF v_old = 'pickup_location_confirmed' AND v_new NOT IN ('picked_up', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis pickup_location_confirmed';
    ELSIF v_old = 'picked_up' AND v_new NOT IN ('in_transit', 'delivered', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis picked_up';
    ELSIF v_old = 'in_transit' AND v_new NOT IN ('delivered', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition invalide depuis in_transit';
    ELSIF v_old = 'delivered' AND v_new NOT IN ('closed') THEN
      RAISE EXCEPTION 'Transition invalide depuis delivered';
    ELSIF v_old IN ('closed', 'cancelled', 'expired') THEN
      RAISE EXCEPTION 'Transition interdite pour un deal terminal';
    END IF;

    IF v_new = 'mutually_accepted' THEN
      v_plain_code := public.generate_secret_delivery_code();
      NEW.secret_code_hash := crypt(v_plain_code, gen_salt('bf'));
      NEW.secret_code_last4 := right(v_plain_code, 4);
      NEW.secret_code_created_at := now();
      NEW.secret_code_consumed_at := NULL;

      INSERT INTO public.deal_delivery_codes (deal_id, code_plain, created_at)
      VALUES (NEW.id, v_plain_code, now())
      ON CONFLICT (deal_id) DO UPDATE
      SET code_plain = EXCLUDED.code_plain,
          created_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_before_write_guard_trigger ON public.deals;
CREATE TRIGGER deals_before_write_guard_trigger
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.deals_before_write_guard();

CREATE OR REPLACE FUNCTION public.deals_status_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid;
  v_traveler uuid;
BEGIN
  v_sender := COALESCE(NEW.sender_id, NEW.owner_user_id);
  v_traveler := COALESCE(NEW.traveler_id, NEW.traveler_user_id);

  INSERT INTO public.order_events (deal_id, from_status, to_status, actor_user_id)
  VALUES (
    NEW.id,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
    NEW.status,
    auth.uid()
  );

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'proposed' THEN
      PERFORM public.push_notification(
        v_traveler,
        'deal_proposed',
        'Nouvelle demande de transport',
        'Un expéditeur a proposé un nouveau deal.',
        NEW.id
      );
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted_by_traveler' THEN
      PERFORM public.push_notification(
        v_sender,
        'deal_accepted_by_traveler',
        'Deal accepté par le transporteur',
        'Confirmez maintenant pour finaliser l''acceptation mutuelle.',
        NEW.id
      );
    ELSIF NEW.status = 'mutually_accepted' THEN
      PERFORM public.push_notification(
        v_sender,
        'deal_mutually_accepted',
        'Deal mutuellement accepté',
        'Le contact et le chat sont maintenant déverrouillés.',
        NEW.id
      );
      PERFORM public.push_notification(
        v_traveler,
        'deal_mutually_accepted',
        'Deal mutuellement accepté',
        'Le contact et le chat sont maintenant déverrouillés.',
        NEW.id
      );
    ELSIF NEW.status = 'pickup_location_selected' THEN
      PERFORM public.push_notification(
        v_sender,
        'pickup_selected',
        'Point pickup proposé',
        'Le transporteur a proposé le point A. Merci de confirmer.',
        NEW.id
      );
    ELSIF NEW.status = 'pickup_location_confirmed' THEN
      PERFORM public.push_notification(
        v_traveler,
        'pickup_confirmed',
        'Pickup confirmé',
        'Le point A est confirmé par l''expéditeur.',
        NEW.id
      );
    ELSIF NEW.status = 'delivered' THEN
      PERFORM public.push_notification(
        v_sender,
        'deal_delivered',
        'Livraison confirmée',
        'Le code secret a été validé avec succès.',
        NEW.id
      );
      PERFORM public.push_notification(
        v_traveler,
        'deal_delivered',
        'Livraison confirmée',
        'Le code secret a été validé avec succès.',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_status_after_change_trigger ON public.deals;
CREATE TRIGGER deals_status_after_change_trigger
  AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.deals_status_after_change();

CREATE OR REPLACE FUNCTION public.messages_after_insert_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal public.deals;
  v_target uuid;
BEGIN
  SELECT * INTO v_deal
  FROM public.deals
  WHERE id = NEW.deal_id;

  IF v_deal.id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = COALESCE(v_deal.sender_id, v_deal.owner_user_id) THEN
    v_target := COALESCE(v_deal.traveler_id, v_deal.traveler_user_id);
  ELSE
    v_target := COALESCE(v_deal.sender_id, v_deal.owner_user_id);
  END IF;

  PERFORM public.push_notification(
    v_target,
    'new_message',
    'Nouveau message',
    left(COALESCE(NEW.content, ''), 120),
    NEW.deal_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_after_insert_notify_trigger ON public.messages;
CREATE TRIGGER messages_after_insert_notify_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.messages_after_insert_notify();

-- -----------------------------------------------------------------------------
-- RLS hardening
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS private_contacts_select_self ON public.private_contacts;
DROP POLICY IF EXISTS "Users can view own private contact" ON public.private_contacts;
CREATE POLICY private_contacts_select_self
  ON public.private_contacts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS private_contacts_insert_self ON public.private_contacts;
DROP POLICY IF EXISTS "Users can upsert own private contact" ON public.private_contacts;
CREATE POLICY private_contacts_insert_self
  ON public.private_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS private_contacts_update_self ON public.private_contacts;
DROP POLICY IF EXISTS "Users can update own private contact" ON public.private_contacts;
CREATE POLICY private_contacts_update_self
  ON public.private_contacts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS trips_authenticated_read ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
CREATE POLICY trips_authenticated_read
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS parcel_requests_authenticated_read ON public.parcel_requests;
DROP POLICY IF EXISTS "Authenticated users can view parcel requests" ON public.parcel_requests;
CREATE POLICY parcel_requests_authenticated_read
  ON public.parcel_requests
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS deals_participants_read ON public.deals;
DROP POLICY IF EXISTS "Participants can view deals" ON public.deals;
CREATE POLICY deals_participants_read
  ON public.deals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      COALESCE(sender_id, owner_user_id),
      COALESCE(traveler_id, traveler_user_id)
    )
  );

DROP POLICY IF EXISTS deals_no_direct_insert ON public.deals;
DROP POLICY IF EXISTS "No direct deal inserts" ON public.deals;
CREATE POLICY deals_no_direct_insert
  ON public.deals
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS deals_no_direct_update ON public.deals;
DROP POLICY IF EXISTS "No direct deal updates" ON public.deals;
CREATE POLICY deals_no_direct_update
  ON public.deals
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS messages_participants_read_after_mutual ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages after mutual acceptance" ON public.messages;
CREATE POLICY messages_participants_read_after_mutual
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = messages.deal_id
        AND auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
        AND public.deal_status_rank(d.status) >= public.deal_status_rank('mutually_accepted')
    )
  );

DROP POLICY IF EXISTS messages_participants_insert_after_mutual ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages after mutual acceptance" ON public.messages;
CREATE POLICY messages_participants_insert_after_mutual
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = messages.deal_id
        AND auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
        AND public.deal_status_rank(d.status) >= public.deal_status_rank('mutually_accepted')
    )
  );

DROP POLICY IF EXISTS "Participants can view contact after mutual acceptance" ON public.private_contacts;
CREATE POLICY "Participants can view contact after mutual acceptance"
  ON public.private_contacts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE (
        (
          COALESCE(d.sender_id, d.owner_user_id) = auth.uid()
          AND COALESCE(d.traveler_id, d.traveler_user_id) = private_contacts.user_id
        )
        OR (
          COALESCE(d.traveler_id, d.traveler_user_id) = auth.uid()
          AND COALESCE(d.sender_id, d.owner_user_id) = private_contacts.user_id
        )
      )
      AND public.deal_status_rank(d.status) >= public.deal_status_rank('mutually_accepted')
    )
  );

-- -----------------------------------------------------------------------------
-- Core RPCs
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.propose_deal(
  p_trip_id uuid,
  p_parcel_request_id uuid
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip public.trips;
  v_parcel public.parcel_requests;
  v_existing public.deals;
  v_new public.deals;
  v_sender uuid;
  v_traveler uuid;
BEGIN
  PERFORM public.expire_old_posts();

  SELECT * INTO v_trip
  FROM public.trips
  WHERE id = p_trip_id
    AND status IN ('active', 'open')
  FOR UPDATE;

  IF v_trip.id IS NULL THEN
    RAISE EXCEPTION 'Trajet indisponible';
  END IF;

  SELECT * INTO v_parcel
  FROM public.parcel_requests
  WHERE id = p_parcel_request_id
    AND status IN ('active', 'open', 'matched', 'in_transit')
  FOR UPDATE;

  IF v_parcel.id IS NULL THEN
    RAISE EXCEPTION 'Colis indisponible';
  END IF;

  v_sender := COALESCE(v_parcel.sender_id, v_parcel.user_id);
  v_traveler := COALESCE(v_trip.traveler_id, v_trip.user_id);

  IF v_sender = v_traveler THEN
    RAISE EXCEPTION 'Un deal ne peut pas être créé avec soi-même';
  END IF;

  IF auth.uid() NOT IN (v_sender, v_traveler) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT * INTO v_existing
  FROM public.deals
  WHERE trip_id = p_trip_id
    AND parcel_request_id = p_parcel_request_id
    AND status NOT IN ('closed', 'cancelled', 'expired')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.deals (
    trip_id,
    parcel_request_id,
    parcel_id,
    owner_user_id,
    traveler_user_id,
    sender_id,
    traveler_id,
    status,
    dropoff_place,
    delivery_place_text,
    dropoff_point_type,
    created_at,
    updated_at
  )
  VALUES (
    p_trip_id,
    p_parcel_request_id,
    p_parcel_request_id,
    v_sender,
    v_traveler,
    v_sender,
    v_traveler,
    'proposed',
    COALESCE(v_parcel.dropoff_place_text, v_parcel.dropoff_place, v_parcel.delivery_point_address),
    COALESCE(v_parcel.dropoff_place_text, v_parcel.dropoff_place, v_parcel.delivery_point_address),
    public.normalize_handoff_point_type(COALESCE(v_parcel.dropoff_place_type, v_parcel.delivery_point_type)),
    now(),
    now()
  )
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

DROP FUNCTION IF EXISTS public.accept_deal(uuid);
DROP FUNCTION IF EXISTS public.accept_deal(uuid, text);

CREATE OR REPLACE FUNCTION public.accept_deal(p_deal_id uuid)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() NOT IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id)) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status NOT IN ('proposed', 'accepted_by_sender', 'accepted_by_traveler') THEN
    RAISE EXCEPTION 'Ce deal ne peut plus être accepté';
  END IF;

  IF auth.uid() = COALESCE(d.sender_id, d.owner_user_id) AND d.status = 'proposed' THEN
    RAISE EXCEPTION 'Le transporteur doit accepter en premier';
  END IF;

  IF auth.uid() = COALESCE(d.traveler_id, d.traveler_user_id) THEN
    UPDATE public.deals
    SET traveler_accepted_at = COALESCE(traveler_accepted_at, now()),
        status = CASE
          WHEN sender_accepted_at IS NOT NULL THEN 'mutually_accepted'
          ELSE 'accepted_by_traveler'
        END,
        mutual_acceptance_actor_id = CASE
          WHEN sender_accepted_at IS NOT NULL THEN auth.uid()
          ELSE mutual_acceptance_actor_id
        END,
        updated_at = now()
    WHERE id = p_deal_id
    RETURNING * INTO d;
  ELSE
    UPDATE public.deals
    SET sender_accepted_at = COALESCE(sender_accepted_at, now()),
        status = CASE
          WHEN traveler_accepted_at IS NOT NULL THEN 'mutually_accepted'
          ELSE 'accepted_by_sender'
        END,
        mutual_acceptance_actor_id = CASE
          WHEN traveler_accepted_at IS NOT NULL THEN auth.uid()
          ELSE mutual_acceptance_actor_id
        END,
        updated_at = now()
    WHERE id = p_deal_id
    RETURNING * INTO d;
  END IF;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_deal(
  p_deal_id uuid,
  p_pickup_point_address text
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.accept_deal(p_deal_id);
END;
$$;

DROP FUNCTION IF EXISTS public.set_pickup_place(uuid, text, text, double precision, double precision);
DROP FUNCTION IF EXISTS public.set_pickup_place(uuid, text, text);
DROP FUNCTION IF EXISTS public.set_pickup_place(uuid, text);

CREATE OR REPLACE FUNCTION public.set_pickup_place(
  p_deal_id uuid,
  p_pickup_place text,
  p_pickup_type text,
  p_pickup_lat double precision,
  p_pickup_lng double precision
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  p public.parcel_requests;
  v_pickup text;
  v_type text;
  v_area text;
  v_distance_km double precision;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> COALESCE(d.traveler_id, d.traveler_user_id) THEN
    RAISE EXCEPTION 'Seul le transporteur peut définir le point A';
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'pickup_location_selected') THEN
    RAISE EXCEPTION 'Le point A se définit après acceptation mutuelle';
  END IF;

  v_pickup := NULLIF(TRIM(COALESCE(p_pickup_place, '')), '');
  v_type := public.normalize_handoff_point_type(p_pickup_type);

  IF v_pickup IS NULL THEN
    RAISE EXCEPTION 'Adresse du point A requise';
  END IF;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Type du point A requis';
  END IF;

  SELECT * INTO p
  FROM public.parcel_requests
  WHERE id = COALESCE(d.parcel_request_id, d.parcel_id);

  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Colis introuvable';
  END IF;

  v_area := NULLIF(TRIM(COALESCE(p.pickup_area_text, '')), '');

  IF p.pickup_radius_km IS NOT NULL
     AND p.pickup_center_lat IS NOT NULL
     AND p.pickup_center_lng IS NOT NULL
     AND p_pickup_lat IS NOT NULL
     AND p_pickup_lng IS NOT NULL THEN
    v_distance_km := public.distance_km(p.pickup_center_lat, p.pickup_center_lng, p_pickup_lat, p_pickup_lng);
    IF v_distance_km > p.pickup_radius_km THEN
      RAISE EXCEPTION 'Le point A est hors du rayon demandé (%.2f km > %.2f km)', v_distance_km, p.pickup_radius_km;
    END IF;
  ELSIF p.pickup_radius_km IS NOT NULL AND v_area IS NULL THEN
    RAISE EXCEPTION 'Validation manuelle requise: renseignez pickup_area_text ou les coordonnées de zone';
  END IF;

  UPDATE public.deals
  SET pickup_place_text = v_pickup,
      pickup_place = v_pickup,
      pickup_point_address = v_pickup,
      pickup_place_type = v_type,
      pickup_point_type = v_type,
      pickup_lat = p_pickup_lat,
      pickup_lng = p_pickup_lng,
      pickup_location_selected_at = now(),
      pickup_point_set_at = COALESCE(pickup_point_set_at, now()),
      status = 'pickup_location_selected',
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pickup_place(
  p_deal_id uuid,
  p_pickup_place text,
  p_pickup_type text
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.set_pickup_place(p_deal_id, p_pickup_place, p_pickup_type, NULL, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pickup_place(
  p_deal_id uuid,
  p_pickup_place text
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.set_pickup_place(p_deal_id, p_pickup_place, NULL, NULL, NULL);
END;
$$;

DROP FUNCTION IF EXISTS public.set_dropoff_place(uuid, text, text);
DROP FUNCTION IF EXISTS public.set_dropoff_place(uuid, text);

CREATE OR REPLACE FUNCTION public.set_dropoff_place(
  p_deal_id uuid,
  p_dropoff_place text,
  p_dropoff_type text
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_dropoff text;
  v_type text;
  v_parcel_id uuid;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> COALESCE(d.sender_id, d.owner_user_id) THEN
    RAISE EXCEPTION 'Seul l''expéditeur peut définir le point B';
  END IF;

  IF public.deal_status_rank(d.status) < public.deal_status_rank('mutually_accepted') THEN
    RAISE EXCEPTION 'Le point B se configure après acceptation mutuelle';
  END IF;

  v_dropoff := NULLIF(TRIM(COALESCE(p_dropoff_place, '')), '');
  v_type := public.normalize_handoff_point_type(p_dropoff_type);

  IF v_dropoff IS NULL THEN
    RAISE EXCEPTION 'Adresse du point B requise';
  END IF;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Type du point B requis';
  END IF;

  v_parcel_id := COALESCE(d.parcel_request_id, d.parcel_id);

  UPDATE public.deals
  SET dropoff_place = v_dropoff,
      delivery_place_text = v_dropoff,
      dropoff_point_type = v_type,
      dropoff_point_set_at = COALESCE(dropoff_point_set_at, now()),
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  UPDATE public.parcel_requests
  SET dropoff_place_text = v_dropoff,
      dropoff_place = v_dropoff,
      delivery_point_address = v_dropoff,
      dropoff_place_type = v_type,
      delivery_point_type = v_type,
      updated_at = now()
  WHERE id = v_parcel_id;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_dropoff_place(
  p_deal_id uuid,
  p_dropoff_place text
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.set_dropoff_place(p_deal_id, p_dropoff_place, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_pickup_location(p_deal_id uuid)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> COALESCE(d.sender_id, d.owner_user_id) THEN
    RAISE EXCEPTION 'Seul l''expéditeur peut confirmer le point A';
  END IF;

  IF d.status <> 'pickup_location_selected' THEN
    RAISE EXCEPTION 'Le point A doit être sélectionné avant confirmation';
  END IF;

  UPDATE public.deals
  SET status = 'pickup_location_confirmed',
      pickup_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_pickup(
  p_deal_id uuid,
  p_content_ok boolean,
  p_size_ok boolean,
  p_photo_url text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() <> COALESCE(d.traveler_id, d.traveler_user_id) THEN
    RETURN false;
  END IF;

  IF d.status <> 'pickup_location_confirmed' THEN
    RETURN false;
  END IF;

  UPDATE public.deals
  SET status = 'picked_up',
      traveler_confirmed_pickup = true,
      updated_at = now()
  WHERE id = p_deal_id;

  INSERT INTO public.handoff_proofs (deal_id, type, photo_url, checklist_content_ok, checklist_size_ok, created_by)
  VALUES (
    p_deal_id,
    'pickup',
    COALESCE(NULLIF(TRIM(p_photo_url), ''), 'fonction-a-venir://pickup-proof'),
    p_content_ok,
    p_size_ok,
    auth.uid()
  );

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_in_transit(p_deal_id uuid)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> COALESCE(d.traveler_id, d.traveler_user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status <> 'picked_up' THEN
    RAISE EXCEPTION 'Le pickup doit être validé avant in_transit';
  END IF;

  UPDATE public.deals
  SET status = 'in_transit',
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_delivery_code_for_owner(p_deal_id uuid)
RETURNS TABLE(code text, code_last4 text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_code text;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> COALESCE(d.sender_id, d.owner_user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF public.deal_status_rank(d.status) < public.deal_status_rank('mutually_accepted') THEN
    RAISE EXCEPTION 'Code indisponible avant acceptation mutuelle';
  END IF;

  IF d.status IN ('closed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Code indisponible pour ce statut';
  END IF;

  SELECT c.code_plain INTO v_code
  FROM public.deal_delivery_codes c
  WHERE c.deal_id = p_deal_id;

  IF v_code IS NULL THEN
    v_code := public.generate_secret_delivery_code();

    UPDATE public.deals
    SET secret_code_hash = crypt(v_code, gen_salt('bf')),
        secret_code_last4 = right(v_code, 4),
        secret_code_created_at = now(),
        secret_code_consumed_at = NULL,
        updated_at = now()
    WHERE id = p_deal_id;

    INSERT INTO public.deal_delivery_codes (deal_id, code_plain, created_at)
    VALUES (p_deal_id, v_code, now())
    ON CONFLICT (deal_id) DO UPDATE
    SET code_plain = EXCLUDED.code_plain,
        created_at = now();
  END IF;

  RETURN QUERY SELECT v_code, right(v_code, 4);
END;
$$;

DROP FUNCTION IF EXISTS public.verify_delivery_code(uuid, text);
CREATE OR REPLACE FUNCTION public.verify_delivery_code(
  p_deal_id uuid,
  p_code text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RETURN QUERY SELECT false, 'Deal introuvable';
    RETURN;
  END IF;

  IF auth.uid() <> COALESCE(d.traveler_id, d.traveler_user_id) THEN
    RETURN QUERY SELECT false, 'Non autorisé';
    RETURN;
  END IF;

  IF d.status NOT IN ('pickup_location_confirmed', 'picked_up', 'in_transit') THEN
    RETURN QUERY SELECT false, 'Statut invalide pour confirmer la livraison';
    RETURN;
  END IF;

  IF d.secret_code_hash IS NULL THEN
    RETURN QUERY SELECT false, 'Code non disponible';
    RETURN;
  END IF;

  IF d.secret_code_consumed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Code déjà utilisé';
    RETURN;
  END IF;

  IF crypt(upper(trim(p_code)), d.secret_code_hash) <> d.secret_code_hash THEN
    RETURN QUERY SELECT false, 'Code incorrect. Livraison non confirmée.';
    RETURN;
  END IF;

  UPDATE public.deals
  SET status = 'delivered',
      delivered_at = now(),
      delivery_confirmed_at = now(),
      traveler_confirmed_delivery = true,
      owner_confirmed_delivery = true,
      secret_code_consumed_at = now(),
      payment_status = 'releasable',
      updated_at = now()
  WHERE id = p_deal_id;

  DELETE FROM public.deal_delivery_codes WHERE deal_id = p_deal_id;

  RETURN QUERY SELECT true, 'Livraison confirmée';
END;
$$;

CREATE OR REPLACE FUNCTION public.close_deal(p_deal_id uuid)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() NOT IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id)) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status <> 'delivered' THEN
    RAISE EXCEPTION 'Seul un deal livré peut être clôturé';
  END IF;

  UPDATE public.deals
  SET status = 'closed',
      closed_at = now(),
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_active_deal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE auth.uid() IN (COALESCE(d.sender_id, d.owner_user_id), COALESCE(d.traveler_id, d.traveler_user_id))
      AND d.status NOT IN ('closed', 'cancelled', 'expired')
  )
$$;

CREATE OR REPLACE FUNCTION public.expire_old_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trips
  SET status = 'expired',
      updated_at = now()
  WHERE status IN ('active', 'open')
    AND COALESCE(departure_time, departure_date) < now();

  UPDATE public.parcel_requests
  SET status = 'expired',
      updated_at = now()
  WHERE status IN ('active', 'open')
    AND date_window_end < now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_deal(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_deal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pickup_place(uuid, text, text, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pickup_place(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pickup_place(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_dropoff_place(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_dropoff_place(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pickup_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pickup(uuid, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_in_transit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_delivery_code_for_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_delivery_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_deal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_deal() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_old_posts() TO authenticated;

-- -----------------------------------------------------------------------------
-- Realtime publication (notifications + messages)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END;
$$;
