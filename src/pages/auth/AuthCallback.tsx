import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * Handles the magic link redirect.
 * Supabase puts tokens in the URL hash; the client auto-exchanges them.
 * We wait for a valid session then redirect accordingly.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;

    const handleSession = async () => {
      // Give the Supabase client a moment to process the hash/query tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (session && !handled) {
        handled = true;
        // Check if profile exists
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (data) {
          navigate("/", { replace: true });
        } else {
          navigate("/profile/setup", {
            replace: true,
            state: { role: session.user.user_metadata?.role || "both" },
          });
        }
        return;
      }

      // If no session yet, listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session && !handled) {
            handled = true;
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle();

            if (data) {
              navigate("/", { replace: true });
            } else {
              navigate("/profile/setup", {
                replace: true,
                state: { role: session.user.user_metadata?.role || "both" },
              });
            }
          }
        }
      );

      // Timeout after 10s
      setTimeout(() => {
        if (!handled) {
          subscription.unsubscribe();
          setError("Le lien a expiré ou est invalide. Veuillez réessayer.");
        }
      }, 10000);
    };

    handleSession();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Erreur de connexion</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            onClick={() => navigate("/auth/login", { replace: true })}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
