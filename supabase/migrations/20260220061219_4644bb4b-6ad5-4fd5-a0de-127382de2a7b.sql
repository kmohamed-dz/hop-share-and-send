
-- Recreate generate_delivery_code trigger function with explicit pgcrypto schema reference
CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  plain_code text;
BEGIN
  IF NEW.status = 'mutually_accepted' AND (OLD.status IS DISTINCT FROM 'mutually_accepted') THEN
    plain_code := 'MAAK-' || lpad(floor(random() * 10000)::text, 4, '0') || '-' || 
                  chr(65 + floor(random() * 26)::int) || chr(65 + floor(random() * 26)::int);
    
    NEW.delivery_code_hash := extensions.crypt(plain_code, extensions.gen_salt('bf'));
    NEW.delivery_code_consumed := false;
    
    INSERT INTO public.deal_delivery_codes (deal_id, code_plain)
    VALUES (NEW.id, plain_code)
    ON CONFLICT (deal_id) DO UPDATE SET code_plain = EXCLUDED.code_plain, created_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also recreate verify_delivery_code RPC with explicit schema
CREATE OR REPLACE FUNCTION public.verify_delivery_code(p_deal_id uuid, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
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
  
  IF v_deal.delivery_code_hash IS NOT NULL AND v_deal.delivery_code_hash = extensions.crypt(p_code, v_deal.delivery_code_hash) THEN
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

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS trigger_generate_delivery_code ON public.deals;
CREATE TRIGGER trigger_generate_delivery_code
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_delivery_code();
