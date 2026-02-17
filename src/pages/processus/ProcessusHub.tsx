import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  Shuffle,
  Contact,
  PackageCheck,
  Fingerprint,
} from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

const sections = [
  {
    to: "/processus/matching",
    icon: Shuffle,
    title: "Matching intelligent",
    description: "Comment MAAK connecte expéditeurs et voyageurs entre wilayas.",
  },
  {
    to: "/processus/contact",
    icon: Contact,
    title: "Protocole de contact",
    description: "Divulgation progressive et consentement bilatéral.",
  },
  {
    to: "/processus/remise",
    icon: PackageCheck,
    title: "Remise & livraison",
    description: "Prise en charge, transfert et confirmation finale.",
  },
  {
    to: "/processus/securite",
    icon: ShieldCheck,
    title: "5 couches de sécurité",
    description: "Architecture sécurité et statut MVP / À venir.",
  },
  {
    to: "/processus/traceabilite",
    icon: Fingerprint,
    title: "Principe de traçabilité",
    description: "Pourquoi MAAK est plus sûr que l’informel.",
  },
];

export default function ProcessusHub() {
  return (
    <ProcessusShell
      title="Processus & sécurité"
      subtitle="Le fonctionnement MAAK, de la publication jusqu’à la confirmation de livraison."
    >
      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-2">Comment ça marche en pratique</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MAAK connecte des trajets déjà prévus avec des demandes d’envoi entre villes et
          wilayas (ex: Alger, Oran, Constantine). Le cœur du modèle est simple: limiter le
          risque par des étapes claires et documentées, sans dépendre de circuits informels.
          Le MVP reste centré sur la fiabilité opérationnelle; toute compensation éventuelle
          est secondaire et, lorsqu’elle existe, exprimée en DZD.
        </p>
      </section>

      <section className="space-y-2.5">
        {sections.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="maak-card p-4 flex items-center gap-3 transition-shadow hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </section>
    </ProcessusShell>
  );
}
