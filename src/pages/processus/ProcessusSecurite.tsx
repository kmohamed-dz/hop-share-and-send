import { Shield, UserCheck, PackageSearch, LockKeyhole, Star, Siren, type LucideIcon } from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

type LayerStatus = "MVP" | "À venir";

interface Layer {
  icon: LucideIcon;
  title: string;
  why: string;
  status: LayerStatus;
  details: string;
}

const layers: Layer[] = [
  {
    icon: UserCheck,
    title: "Vérification d’identité",
    why: "Réduire les comptes anonymes et poser une base de confiance minimale.",
    status: "MVP",
    details: "Compte lié à un utilisateur authentifié dans l’application.",
  },
  {
    icon: PackageSearch,
    title: "Déclaration du colis (contenu, dimensions, valeur estimée)",
    why: "Limiter les surprises au moment de la remise et mieux filtrer les risques.",
    status: "MVP",
    details: "Déclaration structurée lors de la création de la demande d’envoi.",
  },
  {
    icon: LockKeyhole,
    title: "Divulgation progressive (contact verrouillé + consentement bilatéral)",
    why: "Protéger la vie privée avant qu’un accord mutuel ne soit validé.",
    status: "À venir",
    details: "Plan MVP+ avec déverrouillage contact uniquement après double acceptation.",
  },
  {
    icon: Star,
    title: "Score de réputation",
    why: "Récompenser les bons comportements et aider au choix d’un correspondant fiable.",
    status: "À venir",
    details: "Le score sera alimenté par l’historique de transactions confirmées.",
  },
  {
    icon: Siren,
    title: "Signalement & escalade",
    why: "Permettre une réaction rapide en cas d’incident ou de comportement suspect.",
    status: "À venir",
    details: "Canal de signalement dédié et traitement prioritaire des cas sensibles.",
  },
];

export default function ProcessusSecurite() {
  return (
    <ProcessusShell
      title="5 couches de sécurité MAAK"
      subtitle="Cadre sécurité produit avec transparence sur le niveau d’avancement."
      showHubLink
    >
      <section className="maak-card p-4 border-warning/40 bg-warning/5">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-warning" />
          <p className="font-semibold text-sm">Transparence produit</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Les couches marquées “À venir” font partie du plan MVP+ et ne sont pas
          présentées comme déjà déployées.
        </p>
      </section>

      <section className="space-y-3">
        {layers.map(({ icon: Icon, title, why, status, details }) => (
          <article key={title} className="maak-card p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-sm leading-snug">{title}</h2>
              </div>
              <span
                className={`text-[11px] font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                  status === "MVP"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Statut: {status}
              </span>
            </div>
            <div className="text-sm">
              <p className="font-medium">Pourquoi c’est important</p>
              <p className="text-muted-foreground">{why}</p>
            </div>
            <p className="text-xs text-muted-foreground">{details}</p>
          </article>
        ))}
      </section>
    </ProcessusShell>
  );
}
