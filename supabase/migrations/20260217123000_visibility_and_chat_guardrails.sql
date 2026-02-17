-- Visibility guardrails for multi-user experience
-- Trips and parcel requests: visible to authenticated users
-- Deals/messages: restricted to participants
-- Messages only after mutual acceptance (or later)

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated can view active trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
CREATE POLICY "Authenticated users can view trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone authenticated can view active parcel requests" ON public.parcel_requests;
DROP POLICY IF EXISTS "Authenticated users can view parcel requests" ON public.parcel_requests;
CREATE POLICY "Authenticated users can view parcel requests"
  ON public.parcel_requests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can view their own deals" ON public.deals;
DROP POLICY IF EXISTS "Participants can view deals" ON public.deals;
CREATE POLICY "Participants can view deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (auth.uid() = traveler_user_id OR auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "Deal participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can view messages after mutual acceptance" ON public.messages;
CREATE POLICY "Participants can view messages after mutual acceptance"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
        AND d.status IN ('mutually_accepted', 'picked_up', 'delivered_confirmed')
    )
  );

DROP POLICY IF EXISTS "Deal participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages after mutual acceptance" ON public.messages;
CREATE POLICY "Participants can send messages after mutual acceptance"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM public.deals d
      WHERE d.id = deal_id
        AND (d.traveler_user_id = auth.uid() OR d.owner_user_id = auth.uid())
        AND d.status IN ('mutually_accepted', 'picked_up', 'delivered_confirmed')
    )
  );

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Reporters can view own reports" ON public.reports;
CREATE POLICY "Reporters can view own reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports"
  ON public.reports FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reporter_user_id
    AND reporter_user_id <> target_user_id
  );
