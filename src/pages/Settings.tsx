import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Settings as SettingsIcon, Shield, Workflow } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function Settings() {
  const navigate = useNavigate();
  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="maak-section-title">Paramètres</h1>
      </div>
      <Card className="maak-card p-4 flex items-center gap-3">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <p className="text-sm">Préférences de notification, confidentialité et compte (à venir).</p>
      </Card>

      <button
        onClick={() => navigate("/processus")}
        className="w-full"
      >
        <Card className="maak-card p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 text-left">
            <Workflow className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Processus & sécurité</p>
              <p className="text-xs text-muted-foreground">Matching, contact, remise et traçabilité</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </button>

      <button
        onClick={() => navigate("/safety")}
        className="w-full"
      >
        <Card className="maak-card p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 text-left">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">Signaler un incident</p>
              <p className="text-xs text-muted-foreground">Créer un signalement sécurité</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Card>
      </button>
    </div>
  );
}
