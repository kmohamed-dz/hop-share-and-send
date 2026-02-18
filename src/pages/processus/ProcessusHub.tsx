import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shuffle, MessageCircle, PackageCheck, ShieldCheck, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";

const sections = [
  { icon: Shuffle, title: "Matching", desc: "Comment MAAK connecte expéditeurs & voyageurs", to: "/processus/matching" },
  { icon: MessageCircle, title: "Contact", desc: "Divulgation progressive de la confiance", to: "/processus/contact" },
  { icon: PackageCheck, title: "Remise", desc: "Prise en charge, transfert & livraison", to: "/processus/remise" },
  { icon: ShieldCheck, title: "Sécurité", desc: "5 couches de sécurité MAAK", to: "/processus/securite" },
  { icon: Eye, title: "Traçabilité", desc: "Pourquoi MAAK est plus sûr", to: "/processus/traceabilite" },
];

export default function ProcessusHub() {
  const navigate = useNavigate();
  return (
    <div className="px-4 safe-top pb-24">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Processus & Sécurité</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Découvrez comment MAAK fonctionne et protège chaque envoi.
      </p>
      <div className="space-y-3">
        {sections.map(({ icon: Icon, title, desc, to }) => (
          <Card
            key={to}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-border flex items-start gap-3"
            onClick={() => navigate(to)}
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
