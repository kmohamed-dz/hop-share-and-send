-- Ensure phone disclosure is unlocked only after mutual acceptance (or later),
-- while supporting both legacy and new deal columns/status values.

ALTER TABLE public.private_contacts ENABLE ROW LEVEL SECURITY;

-- Backfill contact rows for older users so phone can be displayed when unlocked.
INSERT INTO public.private_contacts (user_id, phone)
SELECT p.user_id, COALESCE(p.phone, '')
FROM public.profiles p
WHERE p.user_id IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET phone = EXCLUDED.phone,
    updated_at = now();

DROP POLICY IF EXISTS "Participants can view contact after mutual acceptance" ON public.private_contacts;

CREATE POLICY "Participants can view contact after mutual acceptance"
  ON public.private_contacts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE (
        (
          COALESCE(d.sender_id, d.owner_user_id) = auth.uid()
          AND COALESCE(d.traveler_id, d.traveler_user_id) = private_contacts.user_id
        )
        OR (
          COALESCE(d.traveler_id, d.traveler_user_id) = auth.uid()
          AND COALESCE(d.sender_id, d.owner_user_id) = private_contacts.user_id
        )
      )
      AND COALESCE(d.status, '') IN (
        'accepted',
        'mutually_accepted',
        'pickup_confirmed',
        'picked_up',
        'delivered',
        'delivered_confirmed',
        'closed'
      )
    )
  );
