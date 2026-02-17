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
