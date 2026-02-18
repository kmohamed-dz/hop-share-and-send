import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Unlock, Eye, MessageCircle, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function ProcessusContact() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Contact</h1>
      </div>

      <h2 className="font-bold text-base mb-3">Divulgation progressive de la confiance</h2>

      <div className="text-sm text-muted-foreground space-y-3 mb-6">
        <p>MAAK utilise un protocole de contact par étapes pour protéger la vie privée.</p>
        <p>Après un match, chaque partie voit uniquement des infos non identifiantes : détails du trajet, timing, score, historique.</p>
        <p>Les infos sensibles (numéro de téléphone, contact direct) restent verrouillées tant que les deux parties n'ont pas accepté.</p>
        <p>Le contact n'est révélé qu'après consentement bilatéral, ce qui empêche le spam et protège les données.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card className="p-4 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Avant acceptation</h3>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><Eye className="h-3 w-3 shrink-0" />Profil non-identifiant</li>
            <li className="flex items-center gap-2"><Eye className="h-3 w-3 shrink-0" />Détails du trajet & timing</li>
            <li className="flex items-center gap-2"><Star className="h-3 w-3 shrink-0" />Score de réputation</li>
          </ul>
        </Card>
        <Card className="p-4 border-primary/30 border bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Unlock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-primary">Après acceptation</h3>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><Unlock className="h-3 w-3 shrink-0 text-primary" />Contact débloqué</li>
            <li className="flex items-center gap-2"><MessageCircle className="h-3 w-3 shrink-0 text-primary" />Chat disponible</li>
            <li className="flex items-center gap-2"><Star className="h-3 w-3 shrink-0 text-primary" />Confirmation mutuelle</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
