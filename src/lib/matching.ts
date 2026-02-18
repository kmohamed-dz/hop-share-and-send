import type { Tables } from "@/integrations/supabase/types";

export interface MatchScore {
  total: number;
  originMatch: boolean;
  destinationMatch: boolean;
  timeMatch: boolean;
  dateFlexible: boolean;
  dateDistanceDays: number;
  dateProximityScore: number;
  categoryMatch: boolean;
  capacityScore: number;
  reputationScore: number;
}

type MatchScoringOptions = {
  reputationAvg?: number | null;
};

function getDateDistanceInDays(departure: Date, start: Date, end: Date): number {
  const midpoint = new Date((start.getTime() + end.getTime()) / 2);
  const diffMs = Math.abs(departure.getTime() - midpoint.getTime());
  return diffMs / (1000 * 60 * 60 * 24);
}

function computeDateProximityScore(dateDistanceDays: number, timeMatch: boolean): number {
  const proximityScore = Math.max(0, 20 - Math.round(dateDistanceDays * 2));
  const inWindowBonus = timeMatch ? 5 : 0;
  return Math.min(25, proximityScore + inWindowBonus);
}

function computeCapacityScore(trip: Tables<"trips">, parcel: Tables<"parcel_requests">): number {
  const categoryCompatible = trip.accepted_categories?.includes(parcel.category) ?? false;
  const note = (trip.capacity_note ?? "").toLowerCase();
  const size = (parcel.size_weight ?? "").toLowerCase();

  let sizeCompatibility = 4;

  if (!size) {
    sizeCompatibility = 5;
  } else if (note.includes("grand") || note.includes("valise") || note.includes("15")) {
    sizeCompatibility = 10;
  } else if (size.includes("small") || size.includes("petit")) {
    sizeCompatibility = 8;
  } else if (size.includes("medium") || size.includes("moyen")) {
    sizeCompatibility = 6;
  } else if (size.includes("large") || size.includes("grand") || size.includes("xlarge")) {
    sizeCompatibility = 3;
  }

  const categoryScore = categoryCompatible ? 5 : 0;
  return Math.min(15, sizeCompatibility + categoryScore);
}

function computeReputationScore(reputationAvg?: number | null): number {
  if (typeof reputationAvg !== "number" || Number.isNaN(reputationAvg)) {
    return 6;
  }

  const bounded = Math.max(0, Math.min(5, reputationAvg));
  return Math.round((bounded / 5) * 10);
}

export function computeTripParcelScore(
  trip: Tables<"trips">,
  parcel: Tables<"parcel_requests">,
  options: MatchScoringOptions = {}
): MatchScore {
  let total = 0;

  const originMatch = trip.origin_wilaya === parcel.origin_wilaya;
  const destinationMatch = trip.destination_wilaya === parcel.destination_wilaya;

  const depDate = new Date(trip.departure_date);
  const start = new Date(parcel.date_window_start);
  const end = new Date(parcel.date_window_end);
  const timeMatch = depDate >= start && depDate <= end;
  const dateFlexible = !timeMatch;

  const dateDistanceDays = getDateDistanceInDays(depDate, start, end);
  const dateProximityScore = computeDateProximityScore(dateDistanceDays, timeMatch);

  const categoryMatch = trip.accepted_categories?.includes(parcel.category) ?? false;
  const capacityScore = computeCapacityScore(trip, parcel);
  const reputationScore = computeReputationScore(options.reputationAvg);

  if (originMatch) total += 25;
  if (destinationMatch) total += 25;
  total += dateProximityScore;
  total += capacityScore;
  total += reputationScore;

  return {
    total: Math.min(100, total),
    originMatch,
    destinationMatch,
    timeMatch,
    dateFlexible,
    dateDistanceDays,
    dateProximityScore,
    categoryMatch,
    capacityScore,
    reputationScore,
  };
}
