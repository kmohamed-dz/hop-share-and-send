-- Required profile fields for auth entry flow
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS wilaya TEXT,
  ADD COLUMN IF NOT EXISTS national_id TEXT;

-- Keep backward compatibility with existing name field
UPDATE public.profiles
SET full_name = NULLIF(TRIM(name), '')
WHERE full_name IS NULL;
