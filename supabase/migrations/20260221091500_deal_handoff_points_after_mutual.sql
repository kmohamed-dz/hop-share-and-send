-- Enforce post-mutual handoff points and canonical point types.
-- Flow target:
-- proposed -> accepted_by_traveler -> mutually_accepted -> points A/B -> pickup -> delivered

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pickup_place TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_place TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_type TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_point_type TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_point_set_at TIMESTAMPTZ;

ALTER TABLE public.parcel_requests
  ADD COLUMN IF NOT EXISTS dropoff_place TEXT;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_pickup_point_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_pickup_point_type_check
  CHECK (
    pickup_point_type IS NULL
    OR pickup_point_type IN (
      'public',
      'office',
      'airport',
      'train',
      'other',
      'public_place',
      'delivery_office',
      'train_station',
      'bus_station'
    )
  );

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_dropoff_point_type_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_dropoff_point_type_check
  CHECK (
    dropoff_point_type IS NULL
    OR dropoff_point_type IN (
      'public',
      'office',
      'airport',
      'train',
      'other',
      'public_place',
      'delivery_office',
      'train_station',
      'bus_station'
    )
  );

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_delivery_point_type_check;
ALTER TABLE public.parcel_requests
  ADD CONSTRAINT parcel_requests_delivery_point_type_check
  CHECK (
    delivery_point_type IS NULL
    OR delivery_point_type IN (
      'public',
      'office',
      'airport',
      'train',
      'other',
      'public_place',
      'delivery_office',
      'train_station',
      'bus_station'
    )
  );

CREATE OR REPLACE FUNCTION public.normalize_deal_point_type(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_type TEXT;
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

DROP FUNCTION IF EXISTS public.accept_deal(UUID, TEXT);
DROP FUNCTION IF EXISTS public.accept_deal(UUID);

CREATE OR REPLACE FUNCTION public.accept_deal(p_deal_id UUID)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_new_status TEXT;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() NOT IN (d.owner_user_id, d.traveler_user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF d.status NOT IN ('proposed', 'accepted_by_sender', 'accepted_by_traveler') THEN
    RAISE EXCEPTION 'Ce deal ne peut plus être accepté';
  END IF;

  -- Required flow: traveler accepts first on a fresh proposal.
  IF auth.uid() = d.owner_user_id AND d.status = 'proposed' THEN
    RAISE EXCEPTION 'Le voyageur doit accepter en premier';
  END IF;

  IF auth.uid() = d.owner_user_id THEN
    UPDATE public.deals
    SET sender_accepted_at = COALESCE(sender_accepted_at, now()),
        updated_at = now()
    WHERE id = p_deal_id
    RETURNING * INTO d;
  ELSE
    UPDATE public.deals
    SET traveler_accepted_at = COALESCE(traveler_accepted_at, now()),
        updated_at = now()
    WHERE id = p_deal_id
    RETURNING * INTO d;
  END IF;

  IF d.sender_accepted_at IS NOT NULL AND d.traveler_accepted_at IS NOT NULL THEN
    v_new_status := 'mutually_accepted';
  ELSIF d.traveler_accepted_at IS NOT NULL THEN
    v_new_status := 'accepted_by_traveler';
  ELSE
    v_new_status := 'accepted_by_sender';
  END IF;

  UPDATE public.deals
  SET status = v_new_status,
      accepted_at = CASE WHEN v_new_status = 'mutually_accepted' THEN COALESCE(accepted_at, now()) ELSE accepted_at END,
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

-- Backward-compatible signature kept intentionally.
CREATE OR REPLACE FUNCTION public.accept_deal(
  p_deal_id UUID,
  p_pickup_point_address TEXT
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

DROP FUNCTION IF EXISTS public.set_pickup_place(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.set_pickup_place(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.set_pickup_place(
  p_deal_id UUID,
  p_pickup_place TEXT,
  p_pickup_type TEXT
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_pickup TEXT;
  v_pickup_type TEXT;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> d.traveler_user_id THEN
    RAISE EXCEPTION 'Seul le voyageur peut définir le point A';
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'pickup_confirmed', 'picked_up') THEN
    RAISE EXCEPTION 'Le point A se définit après acceptation mutuelle';
  END IF;

  v_pickup := NULLIF(TRIM(COALESCE(p_pickup_place, '')), '');
  v_pickup_type := COALESCE(
    public.normalize_deal_point_type(p_pickup_type),
    public.normalize_deal_point_type(d.pickup_point_type)
  );

  IF v_pickup IS NULL THEN
    RAISE EXCEPTION 'Adresse du point A requise';
  END IF;

  IF v_pickup_type IS NULL THEN
    RAISE EXCEPTION 'Type du point A requis';
  END IF;

  UPDATE public.deals
  SET pickup_place = v_pickup,
      pickup_point_address = v_pickup,
      pickup_point_type = v_pickup_type,
      pickup_point_set_at = COALESCE(pickup_point_set_at, now()),
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pickup_place(
  p_deal_id UUID,
  p_pickup_place TEXT
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.set_pickup_place(p_deal_id, p_pickup_place, NULL);
END;
$$;

DROP FUNCTION IF EXISTS public.set_dropoff_place(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.set_dropoff_place(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.set_dropoff_place(
  p_deal_id UUID,
  p_dropoff_place TEXT,
  p_dropoff_type TEXT
)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
  v_dropoff TEXT;
  v_dropoff_type TEXT;
  v_parcel_id UUID;
BEGIN
  SELECT * INTO d
  FROM public.deals
  WHERE id = p_deal_id
  FOR UPDATE;

  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() <> d.owner_user_id THEN
    RAISE EXCEPTION 'Seul l''expéditeur peut définir le point B';
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'pickup_confirmed', 'picked_up') THEN
    RAISE EXCEPTION 'Le point B se définit après acceptation mutuelle';
  END IF;

  v_dropoff := NULLIF(TRIM(COALESCE(p_dropoff_place, '')), '');
  v_dropoff_type := COALESCE(
    public.normalize_deal_point_type(p_dropoff_type),
    public.normalize_deal_point_type(d.dropoff_point_type)
  );
  v_parcel_id := d.parcel_request_id;

  IF v_dropoff IS NULL THEN
    RAISE EXCEPTION 'Adresse du point B requise';
  END IF;

  IF v_dropoff_type IS NULL THEN
    RAISE EXCEPTION 'Type du point B requis';
  END IF;

  UPDATE public.deals
  SET dropoff_place = v_dropoff,
      delivery_place_text = v_dropoff,
      dropoff_point_type = v_dropoff_type,
      dropoff_point_set_at = COALESCE(dropoff_point_set_at, now()),
      updated_at = now()
  WHERE id = p_deal_id
  RETURNING * INTO d;

  IF v_parcel_id IS NOT NULL THEN
    UPDATE public.parcel_requests
    SET dropoff_place = v_dropoff,
        delivery_point_address = v_dropoff,
        delivery_point_type = v_dropoff_type,
        updated_at = now()
    WHERE id = v_parcel_id;
  END IF;

  RETURN d;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_dropoff_place(
  p_deal_id UUID,
  p_dropoff_place TEXT
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

GRANT EXECUTE ON FUNCTION public.accept_deal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_deal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pickup_place(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_pickup_place(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_dropoff_place(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_dropoff_place(UUID, TEXT, TEXT) TO authenticated;
