import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Package, BarChart3, User } from "lucide-react";
import { Card } from "@/components/ui/card";

const criteria = [
  { icon: MapPin, label: "Départ / Arrivée (wilaya/ville)" },
  { icon: Clock, label: "Fenêtre de temps" },
  { icon: Package, label: "Format / poids / volume" },
  { icon: User, label: "Capacité du voyageur" },
  { icon: BarChart3, label: "Historique + score de réputation" },
];

export default function ProcessusMatching() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Matching</h1>
      </div>

      <h2 className="font-bold text-base mb-3">Comment MAAK connecte expéditeurs & voyageurs</h2>

      <div className="text-sm text-muted-foreground space-y-3 mb-6">
        <p>MAAK agit comme une couche de matching intelligente entre deux profils :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>les expéditeurs (propriétaires de colis)</li>
          <li>les voyageurs (qui font déjà le trajet)</li>
        </ul>
        <p>La plateforme ne crée pas de nouveaux trajets : elle active la capacité disponible des déplacements existants.</p>
        <p>Quand un expéditeur publie une demande d'envoi et qu'un voyageur publie un trajet, le système compare : départ, arrivée, date/heure, capacité disponible, formats de colis.</p>
        <p>L'utilisateur n'a pas besoin de chercher manuellement : l'algorithme propose directement les correspondances les plus compatibles.</p>
      </div>

      <Card className="p-4 border border-border">
        <h3 className="font-semibold text-sm mb-3">Ce que l'algorithme regarde</h3>
        <div className="space-y-2.5">
          {criteria.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
