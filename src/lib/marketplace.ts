import { supabase } from "@/integrations/supabase/client";

export const DEAL_FLOW_STATUSES = [
  "proposed",
  "accepted_by_sender",
  "accepted_by_traveler",
  "mutually_accepted",
  "pickup_location_selected",
  "pickup_location_confirmed",
  "picked_up",
  "in_transit",
  "delivered",
  "delivered_confirmed",
  "closed",
  "cancelled",
  "expired",
] as const;

export const TRIP_ACTIVE_STATUSES = ["active", "open"] as const;

const CHAT_UNLOCK_STATUS_SET = new Set([
  "mutually_accepted",
  "pickup_location_selected",
  "pickup_location_confirmed",
  "picked_up",
  "in_transit",
  "delivered",
  "delivered_confirmed",
  "closed",
]);

export const ACTIVE_PARCEL_STATUSES = ["active", "open", "matched", "in_transit"] as const;

export const DEAL_POINT_TYPES = [
  { value: "public", label: "Lieu public" },
  { value: "office", label: "Bureau" },
  { value: "airport", label: "Aéroport" },
  { value: "train", label: "Gare" },
  { value: "other", label: "Autre" },
] as const;

const LEGACY_TO_POINT_TYPE: Record<string, (typeof DEAL_POINT_TYPES)[number]["value"]> = {
  public_place: "public",
  delivery_office: "office",
  train_station: "train",
  bus_station: "train",
};

let expirySyncPromise: Promise<void> | null = null;

export function normalizeDealStatus(status: string): string {
  if (status === "pickup_confirmed") return "pickup_location_confirmed";
  if (status === "delivered_confirmed") return "delivered";
  if (status === "accepted") return "mutually_accepted";
  return status;
}

export function isChatUnlocked(status: string | null | undefined): boolean {
  if (!status) return false;
  return CHAT_UNLOCK_STATUS_SET.has(normalizeDealStatus(status));
}

export function isMutuallyAcceptedOrLater(status: string | null | undefined): boolean {
  if (!status) return false;
  return isChatUnlocked(status);
}

export function isDealClosed(status: string | null | undefined): boolean {
  if (!status) return false;
  return normalizeDealStatus(status) === "closed";
}

export function canMarkDelivered(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = normalizeDealStatus(status);
  return ["pickup_location_confirmed", "picked_up", "in_transit", "mutually_accepted"].includes(normalized);
}

export function normalizePointType(value: string | null | undefined): (typeof DEAL_POINT_TYPES)[number]["value"] | "" {
  if (!value) return "";
  if (DEAL_POINT_TYPES.some((entry) => entry.value === value)) return value as (typeof DEAL_POINT_TYPES)[number]["value"];
  return LEGACY_TO_POINT_TYPE[value] ?? "";
}

export function mapPointTypeLabel(value: string | null | undefined): string {
  const normalized = normalizePointType(value);
  if (!normalized) return "Non défini";
  return DEAL_POINT_TYPES.find((entry) => entry.value === normalized)?.label ?? "Non défini";
}

export async function currentUserHasOpenDeal(): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_active_deal" as never);

  if (error) {
    return false;
  }

  return Boolean(data);
}

export async function syncMarketplaceExpirations(): Promise<void> {
  if (expirySyncPromise) {
    await expirySyncPromise;
    return;
  }

  expirySyncPromise = (async () => {
    try {
      await supabase.rpc("expire_old_posts" as never);
    } catch {
      // Non-blocking: expiry is best-effort
    }
  })();

  try {
    await expirySyncPromise;
  } finally {
    expirySyncPromise = null;
  }
}
