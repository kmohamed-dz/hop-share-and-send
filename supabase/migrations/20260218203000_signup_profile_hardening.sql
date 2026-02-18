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
