import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasPlaceholderConfig =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes("YOUR_PROJECT_REF") ||
  supabaseAnonKey === "YOUR_SUPABASE_ANON_KEY" ||
  supabaseAnonKey === "your_publishable_key_here" ||
  supabaseAnonKey.includes("placeholder");

if (hasPlaceholderConfig) {
  throw new Error(
    "Invalid Supabase config. Set real values for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
