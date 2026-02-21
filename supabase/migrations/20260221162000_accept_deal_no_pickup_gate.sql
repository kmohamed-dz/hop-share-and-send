-- Hotfix: acceptance must not require pickup point.
-- Traveler accepts first, then sender confirms. Pickup/dropoff are set later.

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

  -- Business rule: traveler accepts first on fresh proposals.
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

-- Keep compatibility signature but ignore pickup arg.
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

GRANT EXECUTE ON FUNCTION public.accept_deal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_deal(UUID, TEXT) TO authenticated;
