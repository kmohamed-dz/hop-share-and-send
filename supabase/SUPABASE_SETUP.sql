-- ============================================================================
-- MAAK | Supabase Full Setup (Generated from supabase/migrations)
-- ============================================================================
-- This file is generated from migration files in timestamp order.
-- Run on a fresh Supabase project to match frontend/backend expectations.

-- ---------------------------------------------------------------------------
-- Source migration: 20260215233721_f60638ea-7e28-4fed-b8e3-9e6c79e84a3f.sql
-- ---------------------------------------------------------------------------

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  role_preference TEXT NOT NULL DEFAULT 'both' CHECK (role_preference IN ('traveler', 'owner', 'both')),
  rating_avg NUMERIC(2,1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  deliveries_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_wilaya TEXT NOT NULL,
  destination_wilaya TEXT NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  capacity_note TEXT,
  accepted_categories TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON public.trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Parcel requests table
CREATE TABLE public.parcel_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_wilaya TEXT NOT NULL,
  destination_wilaya TEXT NOT NULL,
  date_window_start TIMESTAMPTZ NOT NULL,
  date_window_end TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  size_weight TEXT,
  photo_url TEXT,
  reward_dzd INTEGER DEFAULT 0,
  notes TEXT,
  forbidden_items_acknowledged BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active parcel requests"
  ON public.parcel_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own parcel requests"
  ON public.parcel_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parcel requests"
  ON public.parcel_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own parcel requests"
  ON public.parcel_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deals table
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id),
  parcel_request_id UUID REFERENCES public.parcel_requests(id),
  traveler_user_id UUID NOT NULL REFERENCES auth.users(id),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'picked_up', 'delivered', 'cancelled')),
  traveler_confirmed_pickup BOOLEAN DEFAULT false,
  owner_confirmed_pickup BOOLEAN DEFAULT false,
  traveler_confirmed_delivery BOOLEAN DEFAULT false,
  owner_confirmed_delivery BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

CREATE POLICY "Users can create deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

-- Messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
      AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

CREATE POLICY "Deal participants can send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
      AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Ratings table
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES public.deals(id),
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(deal_id, from_user_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings about them or they made"
  ON public.ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create ratings for their deals"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND from_user_id != to_user_id
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
      AND d.status = 'delivered'
      AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

-- Reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_user_id UUID NOT NULL REFERENCES auth.users(id),
  deal_id UUID REFERENCES public.deals(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_user_id
    AND reporter_user_id != target_user_id
  );

-- Blocked users table
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id),
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_user_id);

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_user_id AND blocker_user_id != blocked_user_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_parcel_requests_updated_at BEFORE UPDATE ON public.parcel_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), COALESCE(NEW.phone, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- Source migration: 20260217090000_matching_trust_handoff.sql
-- ---------------------------------------------------------------------------
-- Matching + Trust + Handoff + Safety improvements

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (status IN (
    'proposed',
    'accepted_by_sender',
    'accepted_by_traveler',
    'mutually_accepted',
    'picked_up',
    'delivered_confirmed',
    'cancelled'
  ));

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS sender_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS traveler_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','releasable','released'));

UPDATE public.deals
SET status = CASE
  WHEN status = 'accepted' THEN 'mutually_accepted'
  WHEN status = 'delivered' THEN 'delivered_confirmed'
  ELSE status
END;

CREATE TABLE IF NOT EXISTS public.delivery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_visible_code TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  code_last4 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  consumed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.delivery_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sender can view own delivery code" ON public.delivery_codes;
CREATE POLICY "Sender can view own delivery code"
  ON public.delivery_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND d.owner_user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.handoff_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('pickup','delivery')),
  photo_url TEXT NOT NULL,
  checklist_content_ok BOOLEAN,
  checklist_size_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

ALTER TABLE public.handoff_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal participants can view handoff proofs" ON public.handoff_proofs;
CREATE POLICY "Deal participants can view handoff proofs"
  ON public.handoff_proofs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Deal participants can create handoff proofs" ON public.handoff_proofs;
CREATE POLICY "Deal participants can create handoff proofs"
  ON public.handoff_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );

INSERT INTO storage.buckets (id, name, public)
VALUES ('handoff_proofs', 'handoff_proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies are applied separately in SUPABASE_STORAGE_POLICIES.sql
-- because some SQL roles are not owner of storage.objects in Supabase projects.

CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  num_part TEXT;
  alpha_part TEXT;
BEGIN
  num_part := lpad((floor(random() * 10000))::INT::TEXT, 4, '0');
  alpha_part := chr(65 + floor(random() * 26)::INT) || chr(65 + floor(random() * 26)::INT);
  RETURN 'MAAK-' || num_part || '-' || alpha_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_delivery_code_for_deal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_code TEXT;
BEGIN
  IF NEW.status = 'mutually_accepted' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    generated_code := public.generate_delivery_code();

    INSERT INTO public.delivery_codes (deal_id, sender_visible_code, code_hash, code_last4, created_by)
    VALUES (
      NEW.id,
      generated_code,
      crypt(generated_code, gen_salt('bf')),
      right(generated_code, 4),
      NEW.owner_user_id
    )
    ON CONFLICT (deal_id) DO NOTHING;
  END IF;

  NEW.status_updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_delivery_code_when_mutually_accepted ON public.deals;
CREATE TRIGGER create_delivery_code_when_mutually_accepted
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_delivery_code_for_deal();

CREATE OR REPLACE FUNCTION public.accept_deal(p_deal_id UUID)
RETURNS public.deals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.deals;
BEGIN
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id;
  IF d.id IS NULL THEN
    RAISE EXCEPTION 'Deal introuvable';
  END IF;

  IF auth.uid() NOT IN (d.owner_user_id, d.traveler_user_id) THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF auth.uid() = d.owner_user_id THEN
    UPDATE public.deals
    SET sender_accepted_at = COALESCE(sender_accepted_at, now()),
        status = CASE
          WHEN traveler_accepted_at IS NOT NULL THEN 'mutually_accepted'
          ELSE 'accepted_by_sender'
        END
    WHERE id = p_deal_id
    RETURNING * INTO d;
  ELSE
    UPDATE public.deals
    SET traveler_accepted_at = COALESCE(traveler_accepted_at, now()),
        status = CASE
          WHEN sender_accepted_at IS NOT NULL THEN 'mutually_accepted'
          ELSE 'accepted_by_traveler'
        END
    WHERE id = p_deal_id
    RETURNING * INTO d;
  END IF;

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
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() OR d.status <> 'mutually_accepted' THEN
    RETURN false;
  END IF;

  UPDATE public.deals
  SET traveler_confirmed_pickup = true,
      status = 'picked_up'
  WHERE id = p_deal_id;

  INSERT INTO public.handoff_proofs (deal_id, type, photo_url, checklist_content_ok, checklist_size_ok, created_by)
  VALUES (p_deal_id, 'pickup', p_photo_url, p_content_ok, p_size_ok, auth.uid());

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
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() THEN
    RETURN QUERY SELECT false, 'Non autorisé';
    RETURN;
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'picked_up') THEN
    RETURN QUERY SELECT false, 'Ce deal ne peut pas être confirmé maintenant';
    RETURN;
  END IF;

  SELECT * INTO dc FROM public.delivery_codes WHERE deal_id = p_deal_id;
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
  SET consumed_at = now(), consumed_by = auth.uid()
  WHERE id = dc.id;

  UPDATE public.deals
  SET status = 'delivered_confirmed',
      traveler_confirmed_delivery = true,
      owner_confirmed_delivery = true,
      delivery_confirmed_at = now(),
      payment_status = 'releasable'
  WHERE id = p_deal_id;

  RETURN QUERY SELECT true, 'Livraison confirmée ✅';
END;
$$;


DROP POLICY IF EXISTS "Users can create ratings for their deals" ON public.ratings;
CREATE POLICY "Users can create ratings for their deals"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = from_user_id
    AND from_user_id != to_user_id
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id
      AND d.status = 'delivered_confirmed'
      AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
    )
  );


-- ---------------------------------------------------------------------------
-- Source migration: 20260217123000_visibility_and_chat_guardrails.sql
-- ---------------------------------------------------------------------------
-- Visibility guardrails for multi-user experience
-- Trips and parcel requests: visible to authenticated users
-- Deals/messages: restricted to participants
-- Messages only after mutual acceptance (or later)

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
CREATE POLICY "Authenticated users can view trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view active parcel requests" ON public.parcel_requests;
DROP POLICY IF EXISTS "Authenticated users can view parcel requests" ON public.parcel_requests;
CREATE POLICY "Authenticated users can view parcel requests"
  ON public.parcel_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own deals" ON public.deals;
DROP POLICY IF EXISTS "Participants can view deals" ON public.deals;
CREATE POLICY "Participants can view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

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
        AND d.status IN ('mutually_accepted', 'picked_up', 'delivered_confirmed')
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
        AND d.status IN ('mutually_accepted', 'picked_up', 'delivered_confirmed')
    )
  );

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Reporters can view own reports" ON public.reports;
CREATE POLICY "Reporters can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_user_id
    AND reporter_user_id <> target_user_id
  );


-- ---------------------------------------------------------------------------
-- Source migration: 20260217143000_deals_mvp_timestamps_and_placeholders.sql
-- ---------------------------------------------------------------------------
-- Optional MVP+ compatibility improvements for deal lifecycle
-- Keeps current statuses while also allowing simplified labels.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check
  CHECK (
    status IN (
      'proposed',
      'accepted',
      'accepted_by_sender',
      'accepted_by_traveler',
      'mutually_accepted',
      'pickup_confirmed',
      'picked_up',
      'delivered',
      'delivered_confirmed',
      'closed',
      'cancelled'
    )
  );

UPDATE public.deals
SET accepted_at = COALESCE(accepted_at, updated_at)
WHERE status IN ('accepted', 'accepted_by_sender', 'accepted_by_traveler', 'mutually_accepted')
  AND accepted_at IS NULL;

UPDATE public.deals
SET pickup_confirmed_at = COALESCE(pickup_confirmed_at, updated_at)
WHERE status IN ('pickup_confirmed', 'picked_up')
  AND pickup_confirmed_at IS NULL;

UPDATE public.deals
SET delivered_at = COALESCE(delivered_at, delivery_confirmed_at, updated_at)
WHERE status IN ('delivered', 'delivered_confirmed')
  AND delivered_at IS NULL;

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
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() OR d.status <> 'mutually_accepted' THEN
    RETURN false;
  END IF;

  UPDATE public.deals
  SET traveler_confirmed_pickup = true,
      status = 'picked_up',
      pickup_confirmed_at = now(),
      pickup_photo_url = COALESCE(p_photo_url, pickup_photo_url)
  WHERE id = p_deal_id;

  INSERT INTO public.handoff_proofs (deal_id, type, photo_url, checklist_content_ok, checklist_size_ok, created_by)
  VALUES (p_deal_id, 'pickup', COALESCE(p_photo_url, 'fonction-a-venir://pickup-proof'), p_content_ok, p_size_ok, auth.uid());

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
  SELECT * INTO d FROM public.deals WHERE id = p_deal_id;

  IF d.id IS NULL OR d.traveler_user_id <> auth.uid() THEN
    RETURN QUERY SELECT false, 'Non autorisé';
    RETURN;
  END IF;

  IF d.status NOT IN ('mutually_accepted', 'picked_up', 'pickup_confirmed') THEN
    RETURN QUERY SELECT false, 'Ce deal ne peut pas être confirmé maintenant';
    RETURN;
  END IF;

  SELECT * INTO dc FROM public.delivery_codes WHERE deal_id = p_deal_id;
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
  SET consumed_at = now(), consumed_by = auth.uid()
  WHERE id = dc.id;

  UPDATE public.deals
  SET status = 'delivered_confirmed',
      traveler_confirmed_delivery = true,
      owner_confirmed_delivery = true,
      delivery_confirmed_at = now(),
      delivered_at = now(),
      payment_status = 'releasable'
  WHERE id = p_deal_id;

  RETURN QUERY SELECT true, 'Livraison confirmée ✅';
END;
$$;


-- ---------------------------------------------------------------------------
-- Source migration: 20260218075248_e062c42f-40f9-4fb9-86e9-d539a75129ff.sql
-- ---------------------------------------------------------------------------
-- Add pickup/delivery timestamps and photo placeholder to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;


-- ---------------------------------------------------------------------------
-- Source migration: 20260218081309_f331c157-1512-4121-ad65-43ddd32365e7.sql
-- ---------------------------------------------------------------------------

-- Enable pgcrypto for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1) Add delivery + mutual acceptance columns to deals
-- ============================================
ALTER TABLE public.deals 
  ADD COLUMN IF NOT EXISTS delivery_place_text text,
  ADD COLUMN IF NOT EXISTS delivery_place_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_code_hash text,
  ADD COLUMN IF NOT EXISTS delivery_code_consumed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message text;

-- ============================================
-- 2) Separate table for plain delivery codes (owner-only access)
-- ============================================
CREATE TABLE public.deal_delivery_codes (
  deal_id uuid PRIMARY KEY REFERENCES public.deals(id) ON DELETE CASCADE,
  code_plain text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_delivery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view delivery code"
ON public.deal_delivery_codes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.deals d 
    WHERE d.id = deal_delivery_codes.deal_id 
    AND d.owner_user_id = auth.uid()
  )
);

-- No INSERT/UPDATE/DELETE for users — managed by trigger
-- ============================================
-- 3) User settings table
-- ============================================
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'fr',
  notifications_enabled boolean NOT NULL DEFAULT true,
  theme text NOT NULL DEFAULT 'light',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4) Trigger: generate delivery code on mutually_accepted
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_delivery_code_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  plain_code text;
BEGIN
  IF NEW.status = 'mutually_accepted' AND (OLD.status IS DISTINCT FROM 'mutually_accepted') THEN
    plain_code := 'MAAK-' || lpad(floor(random() * 10000)::text, 4, '0') || '-' || 
                  chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
    
    NEW.delivery_code_hash := crypt(plain_code, gen_salt('bf'));
    NEW.delivery_code_consumed := false;
    
    INSERT INTO public.deal_delivery_codes (deal_id, code_plain)
    VALUES (NEW.id, plain_code)
    ON CONFLICT (deal_id) DO UPDATE SET code_plain = EXCLUDED.code_plain, created_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_delivery_code ON public.deals;
CREATE TRIGGER trigger_generate_delivery_code
BEFORE UPDATE ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.generate_delivery_code_trigger();

-- ============================================
-- 5) RPC: verify delivery code (traveler only)
-- ============================================
DROP FUNCTION IF EXISTS public.verify_delivery_code(uuid, text);
CREATE OR REPLACE FUNCTION public.verify_delivery_code(p_deal_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deal record;
BEGIN
  SELECT * INTO v_deal FROM public.deals WHERE id = p_deal_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction introuvable');
  END IF;
  
  IF v_deal.traveler_user_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non autorisé');
  END IF;
  
  IF v_deal.status NOT IN ('pickup_confirmed', 'mutually_accepted') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Statut invalide pour la livraison');
  END IF;
  
  IF v_deal.delivery_code_consumed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code déjà utilisé');
  END IF;
  
  IF v_deal.delivery_code_hash IS NOT NULL AND v_deal.delivery_code_hash = crypt(p_code, v_deal.delivery_code_hash) THEN
    UPDATE public.deals 
    SET status = 'delivered', 
        delivered_at = now(), 
        delivery_code_consumed = true,
        updated_at = now()
    WHERE id = p_deal_id;
    
    DELETE FROM public.deal_delivery_codes WHERE deal_id = p_deal_id;
    
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Code incorrect. Livraison non confirmée.');
  END IF;
END;
$$;

-- ============================================
-- 6) RPC: check if user has active deal
-- ============================================
CREATE OR REPLACE FUNCTION public.has_active_deal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deals
    WHERE (owner_user_id = auth.uid() OR traveler_user_id = auth.uid())
    AND status IN ('proposed', 'accepted', 'mutually_accepted', 'pickup_confirmed')
  );
$$;

-- ============================================
-- 7) Function to expire old posts
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_old_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trips SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND departure_date < now();
  
  UPDATE public.parcel_requests SET status = 'expired', updated_at = now()
  WHERE status = 'active' AND date_window_end < now();
END;
$$;


-- ---------------------------------------------------------------------------
-- Source migration: 20260218120000_profile_required_fields.sql
-- ---------------------------------------------------------------------------
-- Required profile fields for auth entry flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS wilaya TEXT,
  ADD COLUMN IF NOT EXISTS national_id TEXT;

-- Keep backward compatibility with existing name field
UPDATE public.profiles
SET full_name = NULLIF(TRIM(name), '')
WHERE full_name IS NULL;


-- ---------------------------------------------------------------------------
-- Source migration: 20260218143000_security_lifecycle_upgrade.sql
-- ---------------------------------------------------------------------------
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

DROP FUNCTION IF EXISTS public.verify_delivery_code(uuid, text);
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
-- Storage policies are applied separately in SUPABASE_STORAGE_POLICIES.sql.

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


-- ---------------------------------------------------------------------------
-- Source migration: 20260218193000_admin_and_language_preference.sql
-- ---------------------------------------------------------------------------
-- Admin read-only dashboard support + language preference persistence

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language_preference TEXT,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET language_preference = CASE
  WHEN preferred_language = 'ar' THEN 'ar'
  ELSE 'fr'
END
WHERE language_preference IS NULL;

ALTER TABLE public.profiles ALTER COLUMN language_preference SET DEFAULT 'fr';
ALTER TABLE public.profiles ALTER COLUMN language_preference SET NOT NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_language_preference_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_language_preference_check
  CHECK (language_preference IN ('fr', 'ar'));

CREATE OR REPLACE FUNCTION public.prevent_profiles_admin_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.is_admin := false;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Modification de is_admin non autorisée';
    END IF;
  END IF;

  IF NEW.language_preference IS NULL THEN
    NEW.language_preference := CASE
      WHEN NEW.preferred_language = 'ar' THEN 'ar'
      ELSE 'fr'
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profiles_admin_escalation_trigger ON public.profiles;
CREATE TRIGGER prevent_profiles_admin_escalation_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profiles_admin_escalation();

CREATE OR REPLACE FUNCTION public.admin_assert_is_admin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.is_admin = true
  ) THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS TABLE(
  total_auth_users BIGINT,
  total_profiles BIGINT,
  total_trips BIGINT,
  total_parcels BIGINT,
  total_deals BIGINT,
  total_messages BIGINT,
  deals_proposed BIGINT,
  deals_accepted_by_sender BIGINT,
  deals_accepted_by_traveler BIGINT,
  deals_mutually_accepted BIGINT,
  deals_pickup_confirmed BIGINT,
  deals_delivered BIGINT,
  deals_closed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM public.profiles),
    (SELECT COUNT(*) FROM public.trips),
    (SELECT COUNT(*) FROM public.parcel_requests),
    (SELECT COUNT(*) FROM public.deals),
    (SELECT COUNT(*) FROM public.messages),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'proposed'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'accepted_by_sender'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'accepted_by_traveler'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'mutually_accepted'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'pickup_confirmed'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'delivered'),
    (SELECT COUNT(*) FROM public.deals WHERE status = 'closed');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  email_confirmed BOOLEAN,
  profile_complete BOOLEAN,
  wilaya TEXT,
  is_admin BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.created_at,
    (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
    COALESCE(p.profile_complete, false) AS profile_complete,
    p.wilaya,
    COALESCE(p.is_admin, false) AS is_admin
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  ORDER BY u.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_trips(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  origin_wilaya TEXT,
  destination_wilaya TEXT,
  departure_date TIMESTAMPTZ,
  status TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT t.id, t.origin_wilaya, t.destination_wilaya, t.departure_date, t.status, t.user_id, t.created_at
  FROM public.trips t
  ORDER BY t.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_parcels(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  origin_wilaya TEXT,
  destination_wilaya TEXT,
  status TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT p.id, p.origin_wilaya, p.destination_wilaya, p.status, p.user_id, p.created_at
  FROM public.parcel_requests p
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_deals(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  status TEXT,
  owner_user_id UUID,
  traveler_user_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT d.id, d.status, d.owner_user_id, d.traveler_user_id, d.created_at
  FROM public.deals d
  ORDER BY d.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_messages(
  p_limit INTEGER DEFAULT 200,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  deal_id UUID,
  sender_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.admin_assert_is_admin();

  RETURN QUERY
  SELECT m.id, m.deal_id, m.sender_id, m.created_at
  FROM public.messages m
  ORDER BY m.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

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
    WHEN NEW.raw_user_meta_data->>'language_preference' = 'ar' THEN 'ar'
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
    language_preference,
    preferred_language,
    is_admin
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
    v_language,
    v_language,
    false
  )
  ON CONFLICT (user_id) DO UPDATE
  SET name = EXCLUDED.name,
      full_name = EXCLUDED.full_name,
      wilaya = EXCLUDED.wilaya,
      national_id = EXCLUDED.national_id,
      role_preference = EXCLUDED.role_preference,
      language_preference = EXCLUDED.language_preference,
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

REVOKE ALL ON FUNCTION public.admin_assert_is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_users(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_trips(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_parcels(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_deals(INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_messages(INTEGER, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_users(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_trips(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_parcels(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_deals(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_messages(INTEGER, INTEGER) TO authenticated;


-- ---------------------------------------------------------------------------
-- Source migration: 20260218203000_signup_profile_hardening.sql
-- ---------------------------------------------------------------------------
-- Signup hardening: ensure profile fields and trigger are aligned with auth signup metadata

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wilaya_code TEXT,
  ADD COLUMN IF NOT EXISTS wilaya_name TEXT;

UPDATE public.profiles
SET wilaya_name = COALESCE(NULLIF(TRIM(wilaya_name), ''), NULLIF(TRIM(wilaya), ''))
WHERE wilaya_name IS NULL OR TRIM(wilaya_name) = '';

-- Align profile PK with auth user id where possible
UPDATE public.profiles
SET id = user_id
WHERE id <> user_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p2
    WHERE p2.id = public.profiles.user_id
  );

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
  v_wilaya_name TEXT;
  v_wilaya_code TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    ''
  );

  v_wilaya_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'wilaya_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'wilaya'), '')
  );
  v_wilaya_code := NULLIF(TRIM(NEW.raw_user_meta_data->>'wilaya_code'), '');
  v_national_id := NULLIF(TRIM(NEW.raw_user_meta_data->>'national_id'), '');
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''), COALESCE(NEW.phone, ''));
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role_preference' IN ('traveler', 'owner', 'both') THEN NEW.raw_user_meta_data->>'role_preference'
    ELSE 'both'
  END;
  v_language := CASE
    WHEN NEW.raw_user_meta_data->>'language_preference' = 'ar' THEN 'ar'
    WHEN NEW.raw_user_meta_data->>'preferred_language' = 'ar' THEN 'ar'
    ELSE 'fr'
  END;

  INSERT INTO public.profiles (
    id,
    user_id,
    name,
    full_name,
    wilaya,
    wilaya_code,
    wilaya_name,
    national_id,
    phone,
    role_preference,
    profile_complete,
    language_preference,
    preferred_language,
    is_admin
  )
  VALUES (
    NEW.id,
    NEW.id,
    v_full_name,
    v_full_name,
    v_wilaya_name,
    v_wilaya_code,
    v_wilaya_name,
    v_national_id,
    COALESCE(v_phone, ''),
    v_role,
    false,
    v_language,
    v_language,
    false
  )
  ON CONFLICT (user_id) DO UPDATE
  SET id = EXCLUDED.id,
      name = EXCLUDED.name,
      full_name = EXCLUDED.full_name,
      wilaya = EXCLUDED.wilaya,
      wilaya_code = EXCLUDED.wilaya_code,
      wilaya_name = EXCLUDED.wilaya_name,
      national_id = EXCLUDED.national_id,
      role_preference = EXCLUDED.role_preference,
      language_preference = EXCLUDED.language_preference,
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
