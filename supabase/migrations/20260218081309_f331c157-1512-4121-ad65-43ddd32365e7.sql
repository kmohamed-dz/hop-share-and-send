
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
