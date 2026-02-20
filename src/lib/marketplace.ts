import { supabase } from "@/integrations/supabase/client";

export const DEAL_FLOW_STATUSES = [
  "proposed",
  "accepted_by_sender",
  "accepted_by_traveler",
  "mutually_accepted",
  "pickup_confirmed",
  "delivered",
  "closed",
] as const;

const CHAT_UNLOCK_STATUS_SET = new Set([
  "mutually_accepted",
  "pickup_confirmed",
  "delivered",
  "closed",
]);

let expirySyncPromise: Promise<void> | null = null;

export function normalizeDealStatus(status: string): string {
  if (status === "picked_up") return "pickup_confirmed";
  if (status === "delivered_confirmed") return "closed";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("deals")
    .select("id")
    .or(`owner_user_id.eq.${user.id},traveler_user_id.eq.${user.id}`)
    .neq("status", "closed")
    .limit(1);

  if (error) {
    return false;
  }

  return Boolean(data && data.length > 0);
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
