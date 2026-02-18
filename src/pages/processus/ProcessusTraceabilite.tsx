import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProcessusTraceabilite() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Traçabilité</h1>
      </div>

      <h2 className="font-bold text-base mb-3">Pourquoi MAAK est plus sûr que les solutions informelles</h2>

      <div className="text-sm text-muted-foreground space-y-3 mb-8">
        <p>L'avantage principal de MAAK est la traçabilité.</p>
        <p>Dans les échanges informels, il n'y a ni preuve, ni historique, ni recours.</p>
        <p>MAAK transforme chaque transaction en échange documenté : utilisateur identifié, colis déclaré, trajet enregistré, interactions tracées.</p>
        <p>L'objectif n'est pas seulement de connecter des gens — mais de créer un cadre où la confiance devient possible entre inconnus, à grande échelle.</p>
      </div>

      <Button
        onClick={() => navigate("/processus/securite")}
        className="w-full rounded-xl gap-2"
      >
        <ShieldCheck className="h-4 w-4" />
        Voir les règles de sécurité
      </Button>
    </div>
  );
}
