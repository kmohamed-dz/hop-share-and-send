-- Align schema to frontend usage without destructive changes.
-- Rule respected: column additions are ADD COLUMN IF NOT EXISTS only.

-- -----------------------------------------------------------------------------
-- trips columns used by frontend inserts/selects
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origin_wilaya INTEGER,
  ADD COLUMN IF NOT EXISTS destination_wilaya INTEGER,
  ADD COLUMN IF NOT EXISTS departure_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS departure_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capacity TEXT,
  ADD COLUMN IF NOT EXISTS capacity_note TEXT,
  ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS accepted_categories TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- -----------------------------------------------------------------------------
-- parcel_requests columns used by frontend inserts/selects
-- -----------------------------------------------------------------------------
ALTER TABLE public.parcel_requests
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS origin_wilaya INTEGER,
  ADD COLUMN IF NOT EXISTS destination_wilaya INTEGER,
  ADD COLUMN IF NOT EXISTS time_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS time_window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS size_weight TEXT,
  ADD COLUMN IF NOT EXISTS reward_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reward_dzd NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_place TEXT,
  ADD COLUMN IF NOT EXISTS delivery_point_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_point_type TEXT,
  ADD COLUMN IF NOT EXISTS forbidden_ack BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS forbidden_items_acknowledged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- -----------------------------------------------------------------------------
-- deals columns used by frontend filters/selects + deal detail rendering
-- -----------------------------------------------------------------------------
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parcel_request_id UUID REFERENCES public.parcel_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS parcel_id UUID REFERENCES public.parcel_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS traveler_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'proposed',
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS sender_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS traveler_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_place TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_place TEXT,
  ADD COLUMN IF NOT EXISTS delivery_place_text TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_point_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_point_type TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_point_type TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_point_set_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS traveler_confirmed_pickup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS traveler_confirmed_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_confirmed_pickup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS owner_confirmed_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now());

-- -----------------------------------------------------------------------------
-- updated_at trigger (non-destructive, only creates missing triggers)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trips_set_updated_at'
      AND tgrelid = 'public.trips'::regclass
  ) THEN
    CREATE TRIGGER trips_set_updated_at
      BEFORE UPDATE ON public.trips
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'parcel_requests_set_updated_at'
      AND tgrelid = 'public.parcel_requests'::regclass
  ) THEN
    CREATE TRIGGER parcel_requests_set_updated_at
      BEFORE UPDATE ON public.parcel_requests
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'deals_set_updated_at'
      AND tgrelid = 'public.deals'::regclass
  ) THEN
    CREATE TRIGGER deals_set_updated_at
      BEFORE UPDATE ON public.deals
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- RLS visibility alignment
-- - trips + parcel_requests readable by authenticated users (matchable fields)
-- - deals readable only by participants
-- -----------------------------------------------------------------------------
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trips'
      AND policyname = 'trips_authenticated_read'
  ) THEN
    CREATE POLICY trips_authenticated_read
      ON public.trips
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'parcel_requests'
      AND policyname = 'parcel_requests_authenticated_read'
  ) THEN
    CREATE POLICY parcel_requests_authenticated_read
      ON public.parcel_requests
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'deals'
      AND policyname = 'deals_participants_read'
  ) THEN
    CREATE POLICY deals_participants_read
      ON public.deals
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = owner_user_id
        OR auth.uid() = traveler_user_id
        OR auth.uid() = sender_id
        OR auth.uid() = traveler_id
      );
  END IF;
END;
$$;
