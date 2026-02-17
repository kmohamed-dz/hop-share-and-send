import { Camera, CheckCircle2, ClipboardCheck, Handshake, PackageCheck } from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

const checklist = [
  { icon: ClipboardCheck, label: "Vérifier description" },
  { icon: Camera, label: "Prendre photo" },
  { icon: Handshake, label: "Confirmer “Pris en charge”" },
  { icon: PackageCheck, label: "Confirmer “Livré”" },
  { icon: CheckCircle2, label: "Noter l’autre utilisateur" },
];

const etapes = [
  "Prise en charge en point de rencontre convenu.",
  "Transfert documenté (photo horodatée + confirmation).",
  "Transport sur le trajet publié.",
  "Livraison et clôture dans l’application.",
];

export default function ProcessusRemise() {
  return (
    <ProcessusShell
      title="Prise en charge, transfert & livraison - de bout en bout"
      subtitle="Une remise documentée jusqu’à la confirmation finale."
      showHubLink
    >
      <section className="maak-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Après acceptation mutuelle, les deux parties coordonnent la remise. Au moment
          de la prise en charge, le voyageur doit vérifier que le colis correspond à la
          description déclarée.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Une preuve photo horodatée est capturée au moment de la remise (état du colis +
          transfert). Le voyageur suit ensuite son trajet publié et effectue la livraison.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          À la réception, le destinataire confirme dans l’application: cela clôture la
          transaction, met à jour la réputation et (si paiement existe plus tard)
          déclenche la libération.
        </p>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Checklist remise</h2>
        <div className="space-y-2.5">
          {checklist.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Étapes opérationnelles</h2>
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
