import { useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardCheck, Camera, PackageCheck, CheckCircle2, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  { icon: ClipboardCheck, label: "Vérifier description", done: true },
  { icon: Camera, label: "Prendre photo", note: "Fonction à venir", done: false },
  { icon: PackageCheck, label: 'Confirmer "Pris en charge"', done: true },
  { icon: CheckCircle2, label: 'Confirmer "Livré"', done: true },
  { icon: Star, label: "Noter l'autre utilisateur", done: true },
];

export default function ProcessusRemise() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Remise</h1>
      </div>

      <h2 className="font-bold text-base mb-3">Prise en charge, transfert & livraison</h2>

      <div className="text-sm text-muted-foreground space-y-3 mb-6">
        <p>Après acceptation mutuelle, les deux parties coordonnent la remise.</p>
        <p>Au moment de la prise en charge, le voyageur doit vérifier que le colis correspond à la description déclarée.</p>
        <p>Une preuve photo horodatée est capturée au moment de la remise (état du colis + transfert).</p>
        <p>Le voyageur suit ensuite son trajet publié et effectue la livraison.</p>
        <p>À la réception, le destinataire confirme dans l'application : cela clôture la transaction, met à jour la réputation et (si paiement existe plus tard) déclenche la libération.</p>
      </div>

      <Card className="p-4 border border-border">
        <h3 className="font-semibold text-sm mb-3">Checklist remise</h3>
        <div className="space-y-3">
          {steps.map(({ icon: Icon, label, note, done }) => (
            <div key={label} className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-primary/10" : "bg-muted"}`}>
                <Icon className={`h-4 w-4 ${done ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{label}</p>
                {note && <p className="text-xs text-muted-foreground italic">{note}</p>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
