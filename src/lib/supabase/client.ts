import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const SUPABASE_URL =
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ??
  import.meta.env.VITE_SUPABASE_URL ??
  "";
const SUPABASE_ANON_KEY =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_URL.startsWith("http")
);

const safeSupabaseUrl = isSupabaseConfigured
  ? SUPABASE_URL
  : "https://placeholder.supabase.co";
const safeSupabaseAnonKey = isSupabaseConfigured
  ? SUPABASE_ANON_KEY
  : "public-anon-key-placeholder";

if (!isSupabaseConfigured && typeof window !== "undefined") {
  console.warn(
    "Supabase non configure: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY manquants."
  );
}

export const supabase = createClient<Database>(
  safeSupabaseUrl,
  safeSupabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storage: localStorage,
    },
  }
);
