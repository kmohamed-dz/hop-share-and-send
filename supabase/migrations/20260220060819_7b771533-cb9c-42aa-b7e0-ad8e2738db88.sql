
-- Fix status check constraints to include 'expired'
ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_status_check;
ALTER TABLE public.trips ADD CONSTRAINT trips_status_check 
  CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'expired'::text]));

ALTER TABLE public.parcel_requests DROP CONSTRAINT IF EXISTS parcel_requests_status_check;
ALTER TABLE public.parcel_requests ADD CONSTRAINT parcel_requests_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'matched'::text, 'completed'::text, 'cancelled'::text, 'expired'::text]));

-- Also fix deals status to include the bilateral acceptance statuses
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;
-- deals has no status check constraint by default, but add one for safety
-- Actually leave deals unconstrained since it evolves dynamically
