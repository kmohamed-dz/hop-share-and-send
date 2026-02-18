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
