-- Diagnose current schema columns used by frontend.
-- Run this in Supabase SQL editor to inspect the live schema cache inputs.

SELECT
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('trips', 'parcel_requests', 'deals')
ORDER BY table_name, ordinal_position;
