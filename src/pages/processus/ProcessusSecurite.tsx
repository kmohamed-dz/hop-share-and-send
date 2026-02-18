import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCheck, ClipboardList, Lock, Star, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";

const layers = [
  {
    icon: UserCheck,
    title: "Vérification d'identité",
    why: "Garantit que chaque utilisateur est une personne réelle et identifiable.",
    status: "À venir (MVP+)",
  },
  {
    icon: ClipboardList,
    title: "Déclaration du colis",
    why: "Le contenu, les dimensions et la valeur estimée sont déclarés avant tout envoi, limitant les abus.",
    status: "MVP",
  },
  {
    icon: Lock,
    title: "Divulgation progressive",
    why: "Le contact reste verrouillé jusqu'au consentement bilatéral, empêchant le spam et protégeant la vie privée.",
    status: "MVP",
  },
  {
    icon: Star,
    title: "Score de réputation",
    why: "Chaque transaction terminée met à jour la réputation, rendant les utilisateurs fiables visibles.",
    status: "MVP",
  },
  {
    icon: Flag,
    title: "Signalement & escalade",
    why: "Les utilisateurs peuvent signaler un comportement suspect, déclenchant une revue et des mesures.",
    status: "MVP",
  },
];

export default function ProcessusSecurite() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Sécurité</h1>
      </div>

      <h2 className="font-bold text-base mb-3">5 couches de sécurité MAAK</h2>

      <div className="space-y-3">
        {layers.map(({ icon: Icon, title, why, status }, i) => (
          <Card key={title} className="p-4 border border-border">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">{i + 1}. {title}</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status === "MVP" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground"><strong>Pourquoi c'est important :</strong> {why}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
