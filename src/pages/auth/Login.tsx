import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAlgerianPhone } from "@/lib/phone";
import { toast } from "sonner";
import { ArrowLeft, Smartphone, Info } from "lucide-react";

/**
 * Format phone display: 0X XX XX XX XX
 */
function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  // Format as: 0X XX XX XX XX
  let formatted = "";
  for (let i = 0; i < digits.length && i < 10; i++) {
    if (i === 2 || i === 4 || i === 6 || i === 8) formatted += " ";
    formatted += digits[i];
  }
  return formatted;
}

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as any)?.role;

  const rawDigits = phone.replace(/\D/g, "");
  const isPhoneValid = rawDigits.length >= 9 && rawDigits.length <= 10;

  const handlePhoneChange = (value: string) => {
    // Only keep digits
    const digits = value.replace(/\D/g, "");
    // Limit to 10 digits (0XXXXXXXXX)
    setPhone(digits.slice(0, 10));
  };

  const handleSendOTP = async () => {
    if (!isPhoneValid) {
      toast.error("Veuillez entrer un numero valide (ex: 0673 50 75 19)");
      return;
    }

    setLoading(true);
    const fullPhone = normalizeAlgerianPhone(phone);

    // Validate final format
    if (!/^\+213[567]\d{8}$/.test(fullPhone)) {
      toast.error("Format invalide. Utilisez un numero mobile algerien (05/06/07).");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

      if (error) {
        if (error.message.includes("Unsupported phone provider") || error.message.includes("phone provider")) {
          toast.error(
            "Le service SMS n'est pas encore configure. Veuillez contacter l'administrateur pour activer l'envoi de SMS (Twilio/MessageBird) dans les parametres Supabase.",
            { duration: 8000 }
          );
        } else {
          toast.error("Erreur d'envoi du code: " + error.message);
        }
      } else {
        toast.success("Code envoye !");
        setStep("otp");
      }
    } catch (err) {
      toast.error("Erreur de connexion. Verifiez votre connexion internet.");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    const fullPhone = normalizeAlgerianPhone(phone);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });

      if (error) {
        toast.error("Code invalide: " + error.message);
      } else {
        toast.success("Connexion reussie !");
        navigate("/profile/setup", { state: { role } });
      }
    } catch (err) {
      toast.error("Erreur de connexion. Verifiez votre connexion internet.");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f5] safe-top safe-bottom">
      {/* Header */}
      <div className="px-6 pt-4">
        <button
          onClick={() => (step === "otp" ? setStep("phone") : navigate(-1))}
          className="p-2 -ml-2 text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 pt-6 pb-8">
        {/* Phone icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
          <Smartphone className="h-8 w-8 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {step === "phone" ? "Verification du numero" : "Code de verification"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {step === "phone"
            ? "Entrez votre numero de telephone pour recevoir un code de verification par SMS."
            : `Un code a 6 chiffres a ete envoye au +213 ${formatPhoneDisplay(phone)}`}
        </p>
      </div>

      <div className="flex-1 px-6">
        {step === "phone" ? (
          <div className="space-y-4">
            <label className="text-sm font-semibold text-foreground">Numero de telephone</label>
            <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden">
              {/* Country code prefix */}
              <div className="flex items-center gap-2 px-4 py-3 border-r border-border bg-muted/30 shrink-0">
                <span className="text-lg" role="img" aria-label="Algerie">🇩🇿</span>
                <span className="text-sm font-semibold text-foreground">+213</span>
              </div>
              {/* Phone input */}
              <input
                type="tel"
                inputMode="numeric"
                placeholder="0X XX XX XX XX"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="flex-1 px-4 py-3 text-base bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="pr-3">
                <Smartphone className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-semibold text-foreground">Code de verification</label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-12 w-12 text-lg rounded-lg border-border"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-8 space-y-3">
        <Button
          onClick={step === "phone" ? handleSendOTP : handleVerifyOTP}
          disabled={loading || (step === "phone" ? !isPhoneValid : otp.length !== 6)}
          className="w-full h-14 text-base font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
        >
          {loading ? "Chargement..." : step === "phone" ? "Envoyer le code" : "Verifier"}
        </Button>

        {step === "otp" && (
          <button
            onClick={handleSendOTP}
            disabled={loading}
            className="w-full text-center text-sm text-emerald-600 font-medium"
          >
            Renvoyer le code
          </button>
        )}

        {step === "phone" && (
          <div className="flex items-start gap-2 pt-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Des frais de SMS standards peuvent s'appliquer. En continuant, vous acceptez de recevoir un code de verification a usage unique.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
