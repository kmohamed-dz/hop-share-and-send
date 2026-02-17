import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle2, Info } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as any)?.role;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendMagicLink = async () => {
    if (!isEmailValid) {
      toast.error("Veuillez entrer une adresse email valide.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/profile/setup`,
          data: { role: role || "both" },
        },
      });

      if (error) {
        toast.error("Erreur d'envoi : " + error.message);
      } else {
        setStep("sent");
      }
    } catch {
      toast.error("Erreur de connexion. Vérifiez votre connexion internet.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/profile/setup`,
          data: { role: role || "both" },
        },
      });
      if (error) {
        toast.error("Erreur : " + error.message);
      } else {
        toast.success("Lien renvoyé !");
      }
    } catch {
      toast.error("Erreur de connexion.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="px-6 pt-4">
        <button
          onClick={() => (step === "sent" ? setStep("email") : navigate(-1))}
          className="p-2 -ml-2 text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 pt-6 pb-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
          {step === "email" ? (
            <Mail className="h-8 w-8 text-emerald-500" />
          ) : (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {step === "email" ? "Connexion par email" : "Vérifiez votre email"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {step === "email"
            ? "Entrez votre adresse email pour recevoir un lien de connexion sécurisé."
            : `Un lien de connexion a été envoyé à ${email}. Cliquez dessus pour vous connecter.`}
        </p>
      </div>

      <div className="flex-1 px-6">
        {step === "email" ? (
          <div className="space-y-4">
            <label className="text-sm font-semibold text-foreground">
              Adresse email
            </label>
            <Input
              type="email"
              inputMode="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 text-base rounded-xl"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && isEmailValid && handleSendMagicLink()}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Vérifiez votre boîte de réception
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Le lien expire dans 1 heure. Pensez à vérifier vos spams si vous ne le voyez pas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 space-y-3">
        {step === "email" ? (
          <>
            <Button
              onClick={handleSendMagicLink}
              disabled={loading || !isEmailValid}
              className="w-full h-14 text-base font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </Button>
            <div className="flex items-start gap-2 pt-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nous vous enverrons un lien magique pour vous connecter sans mot de passe.
              </p>
            </div>
          </>
        ) : (
          <>
            <Button
              onClick={handleResend}
              disabled={loading}
              variant="outline"
              className="w-full h-14 text-base font-semibold rounded-xl"
            >
              {loading ? "Envoi en cours..." : "Renvoyer le lien"}
            </Button>
            <button
              onClick={() => setStep("email")}
              className="w-full text-center text-sm text-emerald-600 font-medium pt-1"
            >
              Changer d'adresse email
            </button>
          </>
        )}
      </div>
    </div>
  );
}
