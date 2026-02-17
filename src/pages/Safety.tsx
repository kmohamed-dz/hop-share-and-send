import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, CheckCircle } from "lucide-react";

export default function Safety() {
  const navigate = useNavigate();

  const rules = [
    { icon: CheckCircle, text: "Ne transportez jamais d'objets interdits (armes, drogues, matières dangereuses)." },
    { icon: CheckCircle, text: "Vérifiez toujours l'identité de votre correspondant avant la remise." },
    { icon: CheckCircle, text: "Privilégiez les lieux publics pour l'échange de colis." },
    { icon: AlertTriangle, text: "Signalez tout comportement suspect via l'app.", warning: true },
  ];

  return (
    <div className="px-4 safe-top pb-8">
      <div className="pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Sécurité & règles</h1>
      </div>

      <div className="space-y-3">
        {rules.map(({ icon: Icon, text, warning }, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl border ${
              warning ? "border-warning/50 bg-warning/5" : "border-border"
            }`}
          >
            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${warning ? "text-warning" : "text-primary"}`} />
            <p className="text-sm">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
