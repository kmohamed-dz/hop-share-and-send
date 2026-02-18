-- Add pickup/delivery timestamps and photo placeholder to deals
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pickup_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;
