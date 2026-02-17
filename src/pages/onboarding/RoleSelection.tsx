import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Route, Package, Users } from "lucide-react";
import { ONBOARDING_FLAG_KEY } from "@/components/auth/AuthGate";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    id: "traveler",
    icon: Route,
    title: "Voyageur",
    description: "Je voyage et je peux transporter des colis",
  },
  {
    id: "owner",
    icon: Package,
    title: "Expéditeur",
    description: "Je veux envoyer des colis",
  },
  {
    id: "both",
    icon: Users,
    title: "Les deux",
    description: "Je voyage et j'envoie des colis",
  },
] as const;

export type UserRole = typeof ROLES[number]["id"];

export default function RoleSelection() {
  const [selected, setSelected] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selected) {
      localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
      navigate("/auth/login", { state: { role: selected } });
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-6 safe-top safe-bottom">
      <div className="pt-12 pb-6">
        <h1 className="text-2xl font-bold mb-2">Comment allez-vous utiliser MAAK ?</h1>
        <p className="text-muted-foreground">Vous pourrez changer plus tard dans les paramètres.</p>
      </div>

      <div className="flex-1 space-y-3">
        {ROLES.map(({ id, icon: Icon, title, description }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
              selected === id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
              selected === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="pb-8 pt-4">
        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          Continuer
        </Button>
      </div>
    </div>
  );
}
