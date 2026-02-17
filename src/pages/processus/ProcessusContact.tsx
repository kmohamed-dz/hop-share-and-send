import { CheckCircle2, Lock, MessageCircle, Phone, UserCircle2 } from "lucide-react";
import { ProcessusShell } from "./ProcessusShell";

const etapes = [
  "Match confirmé: affichage d’informations non identifiantes.",
  "Acceptation mutuelle: consentement bilatéral explicite.",
  "Déverrouillage du contact: coordination pratique de la remise.",
];

export default function ProcessusContact() {
  return (
    <ProcessusShell
      title="Divulgation progressive de la confiance - comment le contact fonctionne"
      subtitle="Protection de la vie privée avant échange de contact direct."
      showHubLink
    >
      <section className="maak-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          MAAK utilise un protocole de contact par étapes pour protéger la vie privée.
          Après un match, chaque partie voit uniquement des infos non identifiantes:
          détails du trajet, timing, score, historique.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Les infos sensibles (numéro de téléphone, contact direct) restent verrouillées
          tant que les deux parties n’ont pas accepté.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Le contact n’est révélé qu’après consentement bilatéral, ce qui empêche le spam
          et protège les données.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="maak-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Avant acceptation</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4 shrink-0" />
              <span>Profil non-identifiant</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Trajet + score visibles</span>
            </li>
          </ul>
        </article>

        <article className="maak-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Après acceptation</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>Contact débloqué</span>
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>Chat + confirmation</span>
            </li>
          </ul>
        </article>
      </section>

      <section className="maak-card p-4">
        <h2 className="font-semibold text-base mb-3">Étapes du contact sécurisé</h2>
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
