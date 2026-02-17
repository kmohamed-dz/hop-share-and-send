import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Globe, Moon, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="px-4 safe-top pb-8">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Paramètres</h1>
      </div>

      <div className="space-y-1">
        {[
          { icon: Bell, label: "Notifications", desc: "Gérer les alertes" },
          { icon: Globe, label: "Langue", desc: "Français" },
          { icon: Moon, label: "Mode sombre", desc: "Apparence de l'app", toggle: true },
          { icon: Shield, label: "Confidentialité", desc: "Données et vie privée" },
        ].map(({ icon: Icon, label, desc, toggle }) => (
          <div
            key={label}
            className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            {toggle && <Switch />}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        Version 1.0.0 — WasselniDZ
      </p>
    </div>
  );
}
