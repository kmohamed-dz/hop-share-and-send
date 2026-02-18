-- System-level security + lifecycle upgrade for MAAK
-- Covers: auth profile metadata, contact disclosure, lifecycle enforcement,
-- delivery secret code hashing, active-deal lock, and auto expiration.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Profiles: completion + language
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'fr';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_language_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_preferred_language_check
  CHECK (preferred_language IN ('fr', 'ar'));

UPDATE public.profiles
SET preferred_language = CASE
  WHEN preferred_language = 'ar' THEN 'ar'
  ELSE 'fr'
END;

UPDATE public.profiles
SET profile_complete = (
  NULLIF(TRIM(COALESCE(full_name, name, '')), '') IS NOT NULL
  AND NULLIF(TRIM(COALESCE(wilaya, '')), '') IS NOT NULL
  AND NULLIF(TRIM(COALESCE(national_id, '')), '') IS NOT NULL
);

-- -----------------------------------------------------------------------------
-- Contact privacy: dedicated table with strict progressive disclosure policies
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.private_contacts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.private_contacts ENABLE ROW LEVEL SECURITY;

INSERT INTO public.private_contacts (user_id, phone)
SELECT p.user_id, COALESCE(p.phone, '')
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE
SET phone = EXCLUDED.phone,
    updated_at = now();

DROP TRIGGER IF EXISTS update_private_contacts_updated_at ON public.private_contacts;
CREATE TRIGGER update_private_contacts_updated_at
  BEFORE UPDATE ON public.private_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can view own private contact" ON public.private_contacts;
CREATE POLICY "Users can view own private contact"
  ON public.private_contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participants can view contact after mutual acceptance" ON public.private_contacts;
CREATE POLICY "Participants can view contact after mutual acceptance"
  ON public.private_contacts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE (
        (d.owner_user_id = auth.uid() AND d.traveler_user_id = private_contacts.user_id)
        OR (d.traveler_user_id = auth.uid() AND d.owner_user_id = private_contacts.user_id)
      )
      AND d.status IN ('mutually_accepted', 'pickup_confirmed', 'delivered', 'closed')
    )
  );

DROP POLICY IF EXISTS "Users can upsert own private contact" ON public.private_contacts;
CREATE POLICY "Users can upsert own private contact"
  ON public.private_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own private contact" ON public.private_contacts;
CREATE POLICY "Users can update own private contact"
  ON public.private_contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Remove broad profile read access to prevent leaking national_id/phone
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Safe public profile metrics for matching (no sensitive fields)
CREATE OR REPLACE VIEW public.profile_public AS
SELECT
  user_id,
  COALESCE(full_name, name) AS full_name,
  wilaya,
  rating_avg,
  rating_count,
  deliveries_count,
  preferred_language
FROM public.profiles;

GRANT SELECT ON public.profile_public TO authenticated;

-- -----------------------------------------------------------------------------
-- Marketplace expiration + stronger parcel/trip schema
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips
  ADD CONSTRAINT trips_status_check
  CHECK (status IN ('active', 'completed', 'cancelled', 'expired'));

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_status_check;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_requests_status_check
  CHECK (status IN ('active', 'matched', 'completed', 'cancelled', 'expired'));

ALTER TABLE public.parcel_requests
  ADD COLUMN IF NOT EXISTS delivery_point_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_point_type TEXT;

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_delivery_point_type_check;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_requests_delivery_point_type_check
  CHECK (
    delivery_point_type IS NULL
    OR delivery_point_type IN ('public_place', 'delivery_office', 'airport', 'train_station', 'bus_station')
  );

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_delivery_point_required;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_delivery_point_required
  CHECK (
    status <> 'active'
    OR (
      NULLIF(TRIM(COALESCE(delivery_point_address, '')), '') IS NOT NULL
      AND delivery_point_type IS NOT NULL
    )
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.expire_marketplace_records()
RETURNS TABLE(expired_trips INTEGER, expired_parcels INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_trips INTEGER := 0;
  v_expired_parcels INTEGER := 0;
BEGIN
  UPDATE public.trips
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
    AND departure_date < now();
  GET DIAGNOSTICS v_expired_trips = ROW_COUNT;

  UPDATE public.parcel_requests
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'active'
    AND date_window_end < now();
  GET DIAGNOSTICS v_expired_parcels = ROW_COUNT;

  RETURN QUERY SELECT v_expired_trips, v_expired_parcels;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_marketplace_records() TO authenticated;

-- -----------------------------------------------------------------------------
-- Deal lifecycle hardening
-- -----------------------------------------------------------------------------
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pickup_point_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sender_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS traveler_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_payment_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_payment_status_check
  CHECK (payment_status IN ('pending', 'releasable', 'released'));

UPDATE public.deals
SET status = 'mutually_accepted',
    accepted_at = COALESCE(accepted_at, updated_at)
WHERE status = 'accepted';

UPDATE public.deals
SET status = 'pickup_confirmed',
    pickup_confirmed_at = COALESCE(pickup_confirmed_at, updated_at)
WHERE status = 'picked_up';

UPDATE public.deals
SET status = 'closed',
    delivered_at = COALESCE(delivered_at, delivery_confirmed_at, updated_at),
    closed_at = COALESCE(closed_at, now())
WHERE status IN ('delivered_confirmed', 'cancelled');

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status IN (
    'proposed',
    'accepted_by_sender',
    'accepted_by_traveler',
    'mutually_accepted',
    'pickup_confirmed',
    'delivered',
    'closed'
  ));

-- close duplicates before unique active indexes
WITH trip_dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY trip_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.deals
  WHERE trip_id IS NOT NULL
    AND status <> 'closed'
)
UPDATE public.deals d
SET status = 'closed',
    closed_at = COALESCE(d.closed_at, now()),
    delivered_at = COALESCE(d.delivered_at, d.updated_at)
FROM trip_dupes td
WHERE d.id = td.id
  AND td.rn > 1;

WITH parcel_dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY parcel_request_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.deals
  WHERE parcel_request_id IS NOT NULL
    AND status <> 'closed'
)
UPDATE public.deals d
SET status = 'closed',
    closed_at = COALESCE(d.closed_at, now()),
    delivered_at = COALESCE(d.delivered_at, d.updated_at)
FROM parcel_dupes pd
WHERE d.id = pd.id
  AND pd.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS deals_one_open_per_trip_idx
  ON public.deals (trip_id)
  WHERE trip_id IS NOT NULL AND status <> 'closed';

CREATE UNIQUE INDEX IF NOT EXISTS deals_one_open_per_parcel_idx
  ON public.deals (parcel_request_id)
  WHERE parcel_request_id IS NOT NULL AND status <> 'closed';

CREATE UNIQUE INDEX IF NOT EXISTS deals_one_open_pair_idx
  ON public.deals (trip_id, parcel_request_id)
  WHERE trip_id IS NOT NULL AND parcel_request_id IS NOT NULL AND status <> 'closed';

-- Block direct deal insert/update from clients; only RPCs handle lifecycle
DROP POLICY IF EXISTS "Users can create deals" ON public.deals;
DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;
DROP POLICY IF EXISTS "Participants can view deals" ON public.deals;
CREATE POLICY "Participants can view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "No direct deal inserts" ON public.deals;
CREATE POLICY "No direct deal inserts"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct deal updates" ON public.deals;
CREATE POLICY "No direct deal updates"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Messages unlocked only after mutual acceptance or later
DROP POLICY IF EXISTS "Deal participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages after mutual acceptance" ON public.messages;
CREATE POLICY "Participants can view messages after mutual acceptance"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
        AND d.status IN ('mutually_accepted', 'pickup_confirmed', 'delivered', 'closed')
    )
  );

DROP POLICY IF EXISTS "Deal participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages after mutual acceptance" ON public.messages;
CREATE POLICY "Participants can send messages after mutual acceptance"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
        AND d.status IN ('mutually_accepted', 'pickup_confirmed', 'delivered', 'closed')
    )
  );

-- Ratings allowed after delivered/closed lifecycle
DROP POLICY IF EXISTS "Users can create ratings for their deals" ON public.ratings;
CREATE POLICY "Users can create ratings for their deals"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND from_user_id <> to_user_id
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_id
        AND d.status IN ('delivered', 'closed')
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
-- Delivery secret code hashing
-- -----------------------------------------------------------------------------
ALTER TABLE public.delivery_codes
  DROP COLUMN IF EXISTS sender_visible_code,
  ADD COLUMN IF NOT EXISTS owner_revealed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  num_part TEXT;
  alpha_part TEXT;
BEGIN
  num_part := LPAD((FLOOR(random() * 10000))::INT::TEXT, 4, '0');
  alpha_part := CHR(65 + FLOOR(random() * 26)::INT) || CHR(65 + FLOOR(random() * 26)::INT);
  RETURN 'MAAK-' || num_part || '-' || alpha_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_deal_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'proposed' AND NEW.status NOT IN ('accepted_by_sender', 'accepted_by_traveler') THEN
      RAISE EXCEPTION 'Transition invalide depuis proposed';
    ELSIF OLD.status = 'accepted_by_sender' AND NEW.status NOT IN ('mutually_accepted') THEN
      RAISE EXCEPTION 'Transition invalide depuis accepted_by_sender';
    ELSIF OLD.status = 'accepted_by_traveler' AND NEW.status NOT IN ('mutually_accepted') THEN
      RAISE EXCEPTION 'Transition invalide depuis accepted_by_traveler';
    ELSIF OLD.status = 'mutually_accepted' AND NEW.status NOT IN ('pickup_confirmed') THEN
      RAISE EXCEPTION 'Transition invalide depuis mutually_accepted';
    ELSIF OLD.status = 'pickup_confirmed' AND NEW.status NOT IN ('delivered') THEN
      RAISE EXCEPTION 'Transition invalide depuis pickup_confirmed';
    ELSIF OLD.status = 'delivered' AND NEW.status NOT IN ('closed') THEN
      RAISE EXCEPTION 'Transition invalide depuis delivered';
    ELSIF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'Le deal est déjà clôturé';
    END IF;

    IF NEW.status = 'mutually_accepted' THEN
      generated_code := public.generate_delivery_code();

      INSERT INTO public.delivery_codes (deal_id, code_hash, code_last4, created_by, owner_revealed_at)
      VALUES (
        NEW.id,
        crypt(generated_code, gen_salt('bf')),
        right(generated_code, 4),
        NEW.owner_user_id,
        now()
      )
      ON CONFLICT (deal_id) DO UPDATE
      SET code_hash = EXCLUDED.code_hash,
          code_last4 = EXCLUDED.code_last4,
          consumed_at = NULL,
          consumed_by = NULL,
          created_at = now(),
          created_by = EXCLUDED.created_by,
          owner_revealed_at = now();
    END IF;

    IF NEW.status IN ('delivered', 'closed') THEN
      NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    END IF;

    IF NEW.status = 'closed' THEN
      NEW.closed_at := COALESCE(NEW.closed_at, now());
    END IF;

    NEW.status_updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_delivery_code_when_mutually_accepted ON public.deals;
DROP TRIGGER IF EXISTS enforce_deal_status_transitions ON public.deals;
CREATE TRIGGER enforce_deal_status_transitions
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deal_status_transitions();

CREATE OR REPLACE FUNCTION public.assert_no_open_deal(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE (d.owner_user_id = p_user_id OR d.traveler_user_id = p_user_id)
      AND d.status <> 'closed'
  ) THEN
    RAISE EXCEPTION 'Action bloquée: un deal actif existe déjà pour cet utilisateur';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_creation_with_open_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_no_open_deal(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_open_deal_before_trip_insert ON public.trips;
CREATE TRIGGER prevent_open_deal_before_trip_insert
  BEFORE INSERT ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_creation_with_open_deal();

DROP TRIGGER IF EXISTS prevent_open_deal_before_parcel_insert ON public.parcel_requests;
CREATE TRIGGER prevent_open_deal_before_parcel_insert
  BEFORE INSERT ON public.parcel_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_creation_with_open_deal();

CREATE OR REPLACE FUNCTION public.propose_deal(
  p_trip_id UUID,
  p_parcel_request_id UUID
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d_existing public.deals;
  d_new public.deals;
  p public.parcel_requests;
  t public.trips;
BEGIN
  PERFORM public.expire_marketplace_records();

  SELECT * INTO t
  FROM public.trips
  WHERE id = p_trip_id
    AND status = 'active';

  IF t.id IS NULL THEN
    RAISE EXCEPTION 'Trajet indisponible';
  END IF;

  SELECT * INTO p
  FROM public.parcel_requests
  WHERE id = p_parcel_request_id
    AND status = 'active';

  IF p.id IS NULL THEN
    RAISE EXCEPTION 'Colis indisponible';
  END IF;

  IF t.user_id = p.user_id THEN
    RAISE EXCEPTION 'Un deal ne peut pas être créé avec soi-même';
  END IF;

  IF auth.uid() NOT IN (t.user_id, p.user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  PERFORM public.assert_no_open_deal(t.user_id);
  PERFORM public.assert_no_open_deal(p.user_id);

  SELECT * INTO d_existing
  FROM public.deals
  WHERE trip_id = p_trip_id
    AND parcel_request_id = p_parcel_request_id
    AND status <> 'closed'
  LIMIT 1;

  IF d_existing.id IS NOT NULL THEN
    RETURN d_existing;
  END IF;

  INSERT INTO public.deals (
    trip_id,
    parcel_request_id,
    traveler_user_id,
    owner_user_id,
    status
  )
  VALUES (
    p_trip_id,
    p_parcel_request_id,
    t.user_id,
    p.user_id,
    'proposed'
  )
  RETURNING * INTO d_new;

  RETURN d_new;
END;
$$;

DROP FUNCTION IF EXISTS public.accept_deal(UUID);
DROP FUNCTION IF EXISTS public.accept_deal(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.accept_deal(
  p_deal_id UUID,
  p_pickup_point_address TEXT DEFAULT NULL
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_delivery_point_address TEXT;
  v_delivery_point_type TEXT;
  v_pickup_point TEXT;
  v_status TEXT;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() NOT IN (d.owner_user_id, d.traveler_user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status NOT IN ('proposed', 'accepted_by_sender', 'accepted_by_traveler') THEN
    RAISE EXCEPTION 'Ce deal ne peut plus être accepté';
  END IF;

  IF auth.uid() = d.owner_user_id THEN
    UPDATE public.deals
    SET sender_accepted_at = COALESCE(sender_accepted_at, now())
    WHERE id = p_deal_id
    RETURNING * INTO d;
  ELSE
    v_pickup_point := COALESCE(
      NULLIF(TRIM(p_pickup_point_address), ''),
      NULLIF(TRIM(d.pickup_point_address), '')
    );

    IF v_pickup_point IS NULL THEN
      RAISE EXCEPTION 'Le voyageur doit définir le point de pickup';
    END IF;

    UPDATE public.deals
    SET traveler_accepted_at = COALESCE(traveler_accepted_at, now()),
        pickup_point_address = v_pickup_point,
        pickup_point_set_at = COALESCE(pickup_point_set_at, now())
    WHERE id = p_deal_id
    RETURNING * INTO d;
  END IF;

  SELECT delivery_point_address, delivery_point_type
  INTO v_delivery_point_address, v_delivery_point_type
  FROM public.parcel_requests
  WHERE id = d.parcel_request_id;

  IF d.sender_accepted_at IS NOT NULL
     AND d.traveler_accepted_at IS NOT NULL
     AND NULLIF(TRIM(COALESCE(d.pickup_point_address, '')), '') IS NOT NULL
     AND NULLIF(TRIM(COALESCE(v_delivery_point_address, '')), '') IS NOT NULL
     AND v_delivery_point_type IS NOT NULL THEN
    v_status := 'mutually_accepted';
  ELSIF d.sender_accepted_at IS NOT NULL AND d.traveler_accepted_at IS NULL THEN
    v_status := 'accepted_by_sender';
  ELSIF d.traveler_accepted_at IS NOT NULL AND d.sender_accepted_at IS NULL THEN
    v_status := 'accepted_by_traveler';
  ELSE
    v_status := d.status;
  END IF;

  UPDATE public.deals
  SET status = v_status,
      accepted_at = CASE
        WHEN v_status = 'mutually_accepted' THEN COALESCE(accepted_at, now())
        ELSE accepted_at
      END
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_pickup(
  p_deal_id UUID,
  p_content_ok BOOLEAN,
  p_size_ok BOOLEAN,
  p_photo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() OR d.status <> 'mutually_accepted' THEN
    RETURN false;
  END IF;

  UPDATE public.deals
  SET traveler_confirmed_pickup = true,
      status = 'pickup_confirmed',
      pickup_confirmed_at = now()
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

CREATE OR REPLACE FUNCTION public.verify_delivery_code(
  p_deal_id UUID,
  p_code TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  dc public.delivery_codes;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() THEN
    RETURN QUERY SELECT false, 'Non autorisé';
    RETURN;
  END IF;

  IF d.status <> 'pickup_confirmed' THEN
    RETURN QUERY SELECT false, 'Confirmez d''abord le pickup avant la livraison';
    RETURN;
  END IF;

  SELECT * INTO dc
  FROM public.delivery_codes
  WHERE deal_id = p_deal_id;

  IF dc.id IS NULL THEN
    RETURN QUERY SELECT false, 'Code non disponible';
    RETURN;
  END IF;

  IF dc.consumed_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Code déjà utilisé';
    RETURN;
  END IF;

  IF crypt(p_code, dc.code_hash) <> dc.code_hash THEN
    RETURN QUERY SELECT false, 'Code incorrect. Livraison non confirmée.';
    RETURN;
  END IF;

  UPDATE public.delivery_codes
  SET consumed_at = now(),
      consumed_by = auth.uid()
  WHERE id = dc.id;

  UPDATE public.deals
  SET status = 'delivered',
      traveler_confirmed_delivery = true,
      owner_confirmed_delivery = true,
      delivery_confirmed_at = now(),
      delivered_at = now(),
      payment_status = 'releasable'
  WHERE id = p_deal_id;

  UPDATE public.deals
  SET status = 'closed',
      closed_at = now()
  WHERE id = p_deal_id;

  RETURN QUERY SELECT true, 'Livraison confirmée et deal clôturé ✅';
END;
$$;

CREATE OR REPLACE FUNCTION public.issue_delivery_code_for_owner(
  p_deal_id UUID
)
RETURNS TABLE(code TEXT, code_last4 TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  dc public.delivery_codes;
  generated_code TEXT;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF d.owner_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'pickup_confirmed') THEN
    RAISE EXCEPTION 'Code indisponible pour ce statut';
  END IF;

  SELECT * INTO dc
  FROM public.delivery_codes
  WHERE deal_id = p_deal_id;

  IF dc.id IS NOT NULL AND dc.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Code déjà consommé';
  END IF;

  generated_code := public.generate_delivery_code();

  INSERT INTO public.delivery_codes (deal_id, code_hash, code_last4, created_by, owner_revealed_at)
  VALUES (
    p_deal_id,
    crypt(generated_code, gen_salt('bf')),
    RIGHT(generated_code, 4),
    auth.uid(),
    now()
  )
  ON CONFLICT (deal_id) DO UPDATE
  SET code_hash = EXCLUDED.code_hash,
      code_last4 = EXCLUDED.code_last4,
      consumed_at = NULL,
      consumed_by = NULL,
      created_at = now(),
      created_by = auth.uid(),
      owner_revealed_at = now();

  RETURN QUERY SELECT generated_code, RIGHT(generated_code, 4);
END;
$$;

GRANT EXECUTE ON FUNCTION public.propose_deal(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_deal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_pickup(UUID, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_delivery_code(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_delivery_code_for_owner(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- Storage guardrail for handoff proofs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Deal participants can read handoff proofs files" ON storage.objects;
CREATE POLICY "Deal participants can read handoff proofs files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'handoff_proofs'
  AND EXISTS (
    SELECT 1
    FROM public.deals d
    WHERE d.id::text = split_part(name, '/', 1)
      AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
  )
);

-- -----------------------------------------------------------------------------
-- Signup trigger: initialize profile + private contact from auth metadata
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_language TEXT;
  v_national_id TEXT;
  v_phone TEXT;
  v_role TEXT;
  v_wilaya TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_wilaya := NULLIF(TRIM(NEW.raw_user_meta_data->>'wilaya'), '');
  v_national_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'national_id'), '');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), COALESCE(NEW.phone, ''));
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role_preference' IN ('traveler', 'owner', 'both') THEN NEW.raw_user_meta_data->>'role_preference'
    ELSE 'both'
  END;
  v_language := CASE
    WHEN NEW.raw_user_meta_data->>'preferred_language' = 'ar' THEN 'ar'
    ELSE 'fr'
  END;

  INSERT INTO public.profiles (
    user_id,
    name,
    full_name,
    wilaya,
    national_id,
    phone,
    role_preference,
    profile_complete,
    preferred_language
  )
  VALUES (
    NEW.id,
    v_full_name,
    v_full_name,
    v_wilaya,
    v_national_id,
    COALESCE(v_phone, ''),
    v_role,
    false,
    v_language
  )
  ON CONFLICT (user_id) DO UPDATE
  SET name = EXCLUDED.name,
      full_name = EXCLUDED.full_name,
      wilaya = EXCLUDED.wilaya,
      national_id = EXCLUDED.national_id,
      role_preference = EXCLUDED.role_preference,
      preferred_language = EXCLUDED.preferred_language,
      updated_at = now();

  INSERT INTO public.private_contacts (user_id, phone)
  VALUES (NEW.id, COALESCE(v_phone, ''))
  ON CONFLICT (user_id) DO UPDATE
  SET phone = EXCLUDED.phone,
      updated_at = now();

  RETURN NEW;
END;
$$;
