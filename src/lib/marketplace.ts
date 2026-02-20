import { supabase } from "@/integrations/supabase/client";

export const DEAL_FLOW_STATUSES = [
  "proposed",
  "accepted_by_sender",
  "accepted_by_traveler",
  "mutually_accepted",
  "picked_up",
  "delivered_confirmed",
  "closed",
] as const;

const CHAT_UNLOCK_STATUS_SET = new Set([
  "mutually_accepted",
  "picked_up",
  "delivered_confirmed",
  "closed",
]);

export const ACTIVE_PARCEL_STATUSES = ["open", "matched", "in_transit"] as const;

let expirySyncPromise: Promise<void> | null = null;

export function normalizeDealStatus(status: string): string {
  if (status === "pickup_confirmed") return "picked_up";
  if (status === "delivered") return "delivered_confirmed";
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
