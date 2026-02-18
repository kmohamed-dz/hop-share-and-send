import { supabase } from "@/integrations/supabase/client";

export type SupabaseAuthUrlParams = {
  accessToken: string | null;
  code: string | null;
  refreshToken: string | null;
  type: string | null;
};

function collectParams(url: URL): URLSearchParams {
  const merged = new URLSearchParams(url.search);

  const rawHash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (!rawHash) {
    return merged;
  }

  const hashQueryPart = rawHash.includes("?") ? rawHash.split("?")[1] : rawHash;
  const hashParams = new URLSearchParams(hashQueryPart);

  hashParams.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.set(key, value);
    }
  });

  return merged;
}

export function extractSupabaseAuthParamsFromCurrentUrl(): SupabaseAuthUrlParams {
  const url = new URL(window.location.href);
  const params = collectParams(url);

  return {
    code: params.get("code"),
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type"),
  };
}

export async function resolveSessionFromAuthUrl(): Promise<void> {
  const { code, accessToken, refreshToken } = extractSupabaseAuthParamsFromCurrentUrl();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return;
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }
  }
}
