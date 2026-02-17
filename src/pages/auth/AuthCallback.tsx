import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Handles the magic link redirect.
 * Supabase puts tokens in the URL hash; the client auto-exchanges them.
 * We just wait for a session then redirect.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Check if profile exists
        supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              navigate("/", { replace: true });
            } else {
              navigate("/profile/setup", {
                replace: true,
                state: { role: session.user.user_metadata?.role || "both" },
              });
            }
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
