import { supabase } from "@/integrations/supabase/client";

export type ProfileRecord = Record<string, unknown>;

async function fetchProfileByColumn(
  column: "id" | "user_id",
  userId: string
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq(column, userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as ProfileRecord;
}

export async function fetchProfileByAuthUserId(
  userId: string
): Promise<ProfileRecord | null> {
  const byId = await fetchProfileByColumn("id", userId);
  if (byId) {
    return byId;
  }

  return fetchProfileByColumn("user_id", userId);
}
