import type { Tables } from "@/integrations/supabase/types";

export interface MatchScore {
  total: number;
  originMatch: boolean;
  destinationMatch: boolean;
  timeMatch: boolean;
  categoryMatch: boolean;
}

export function computeTripParcelScore(
  trip: Tables<"trips">,
  parcel: Tables<"parcel_requests">
): MatchScore {
  let total = 0;
  const originMatch = trip.origin_wilaya === parcel.origin_wilaya;
  const destinationMatch = trip.destination_wilaya === parcel.destination_wilaya;

  if (originMatch) total += 40;
  if (destinationMatch) total += 40;

  const depDate = new Date(trip.departure_date);
  const start = new Date(parcel.date_window_start);
  const end = new Date(parcel.date_window_end);
  const timeMatch = depDate >= start && depDate <= end;
  if (timeMatch) total += 15;

  const categoryMatch = trip.accepted_categories?.includes(parcel.category) ?? false;
  if (categoryMatch) total += 5;

  return { total, originMatch, destinationMatch, timeMatch, categoryMatch };
}
