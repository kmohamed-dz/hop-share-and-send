import { Link } from "react-router-dom";
import { ArrowRight, Fingerprint, Route, FileText, ShieldCheck } from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

const traces = [
  {
    icon: Fingerprint,
    label: "Utilisateur identifié",
  },
  {
    icon: FileText,
    label: "Colis déclaré",
  },
  {
    icon: Route,
    label: "Trajet enregistré",
  },
  {
    icon: ShieldCheck,
    label: "Interactions tracées",
  },
];

export default function ProcessusTraceabilite() {
  return (
    <ProcessusShell
      title="Pourquoi MAAK est plus sûr que les solutions informelles"
      subtitle="Le principe central: la traçabilité."
      showHubLink
    >
      <section className="maak-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          L’avantage principal de MAAK est la traçabilité. Dans les échanges informels, il
          n’y a ni preuve, ni historique, ni recours.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          MAAK transforme chaque transaction en échange documenté: utilisateur identifié,
          colis déclaré, trajet enregistré, interactions tracées.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          L’objectif n’est pas seulement de connecter des gens, mais de créer un cadre
          où la confiance devient possible entre inconnus, à grande échelle.
        </p>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Ce qui est documenté</h2>
        <div className="grid grid-cols-2 gap-2">
          {traces.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-xl border border-border/80 p-2.5">
              <Icon className="h-4 w-4 text-primary mb-1.5" />
              <p className="text-xs font-medium leading-snug">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <Link to="/processus/securite" className="maak-primary-btn w-full">
        Voir les règles de sécurité
        <ArrowRight className="h-4 w-4" />
      </Link>
    </ProcessusShell>
  );
}
