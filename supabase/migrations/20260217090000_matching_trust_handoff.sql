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

DROP POLICY IF EXISTS "Users can upload handoff proofs" ON storage.objects;
CREATE POLICY "Users can upload handoff proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'handoff_proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "Deal participants can read handoff proofs files" ON storage.objects;
CREATE POLICY "Deal participants can read handoff proofs files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'handoff_proofs');

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
