import { Clock3, MapPin, Package, Scale, Star, Users } from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

const criteres = [
  { icon: MapPin, label: "Départ / Arrivée (wilaya/ville)" },
  { icon: Clock3, label: "Fenêtre de temps" },
  { icon: Scale, label: "Format/poids/volume" },
  { icon: Package, label: "Capacité du voyageur" },
  { icon: Star, label: "Historique + score de réputation" },
];

const etapes = [
  "Publication d’une demande d’envoi et d’un trajet actif.",
  "Comparaison automatique des critères clés (lieu, temps, capacité, format).",
  "Proposition des correspondances les plus compatibles, sans recherche manuelle.",
];

export default function ProcessusMatching() {
  return (
    <ProcessusShell
      title="Comment MAAK connecte expéditeurs & voyageurs"
      subtitle="Matching intelligent sur des trajets existants."
      showHubLink
    >
      <section className="maak-card p-4 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          MAAK agit comme une couche de matching intelligente entre deux profils:
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>les expéditeurs (propriétaires de colis)</span>
          </li>
          <li className="flex items-start gap-2">
            <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>les voyageurs (qui font déjà le trajet)</span>
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed">
          La plateforme ne crée pas de nouveaux trajets: elle active la capacité disponible
          des déplacements existants. Quand un expéditeur publie une demande d’envoi et
          qu’un voyageur publie un trajet, le système compare départ, arrivée, date/heure,
          capacité disponible et formats de colis.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          L’utilisateur n’a pas besoin de chercher manuellement: l’algorithme propose
          directement les correspondances les plus compatibles.
        </p>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Ce que l’algorithme regarde</h2>
        <ul className="space-y-2">
          {criteres.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-sm">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Étapes du matching</h2>
        <ol className="space-y-2">
          {etapes.map((step, index) => (
            <li key={step} className="flex items-start gap-2 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5 shrink-0">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </ProcessusShell>
  );
}
