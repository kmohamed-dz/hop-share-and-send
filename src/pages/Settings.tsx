import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";

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
    </div>
  );
}
