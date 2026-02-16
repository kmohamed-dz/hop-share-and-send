import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Camera } from "lucide-react";

export default function ProfileSetup() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as { role?: string } | null)?.role || "both";

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/onboarding/welcome");
      }
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Erreur d'authentification");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      name: name.trim(),
      role_preference: role,
      phone: user.phone || "",
    });

    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Profil créé !");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 safe-top safe-bottom">
      <div className="pt-12 pb-6">
        <h1 className="text-2xl font-bold mb-2">Créez votre profil</h1>
        <p className="text-muted-foreground">Dites-nous comment vous appeler.</p>
      </div>

      <div className="flex-1 space-y-6">
        {/* Avatar placeholder */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-base">Nom complet</Label>
          <Input
            id="name"
            placeholder="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base rounded-xl"
            autoFocus
          />
        </div>
      </div>

      <div className="pb-8">
        <Button
          onClick={handleSubmit}
          disabled={loading || !name.trim()}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {loading ? "Chargement..." : "Terminer"}
        </Button>
      </div>
    </div>
  );
}
