import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { LogOut, Settings, Shield, Star, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data }) => setProfile(data));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/onboarding/welcome");
  };

  if (!user) {
    return (
      <div className="px-4 safe-top">
        <div className="pt-6 pb-4">
          <h1 className="text-xl font-bold">Profil</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-medium mb-4">Connectez-vous pour voir votre profil</p>
          <Button onClick={() => navigate("/auth/login")} className="rounded-xl">
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 safe-top">
      <div className="pt-6 pb-4">
        <h1 className="text-xl font-bold">Profil</h1>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <User className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">{profile?.name || "Utilisateur"}</p>
          <p className="text-sm text-muted-foreground">{user.phone || ""}</p>
        </div>
      </div>

      <div className="space-y-1">
        {[
          { icon: Star, label: "Mes évaluations", to: "/profile/ratings" },
          { icon: Shield, label: "Sécurité & règles", to: "/safety" },
          { icon: Settings, label: "Paramètres", to: "/settings" },
        ].map(({ icon: Icon, label, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{label}</span>
          </button>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 transition-colors text-left text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium text-sm">Déconnexion</span>
        </button>
      </div>
    </div>
  );
}
