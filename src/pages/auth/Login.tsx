import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Info, Smartphone } from "lucide-react";

import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidAlgerianMobile,
  normalizeAlgerianPhone,
  sanitizeAlgerianMobileInput,
} from "@/lib/phone";
import { toast } from "sonner";

type LoginLocationState = {
  role?: string;
};

const ALGERIA_HELPER_TEXT = "Entrez 5XXXXXXXX (sans le 0)";

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";

  let formatted = "";
  for (let i = 0; i < digits.length && i < 9; i += 1) {
    if (i === 2 || i === 4 || i === 6 || i === 8) formatted += " ";
    formatted += digits[i];
  }

  return formatted;
}

function isMissingSmsProviderError(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes("unsupported phone provider") || normalizedMessage.includes("phone provider");
}

function buildOtpErrorMessage(message: string): { title: string; description?: string } {
  if (isMissingSmsProviderError(message)) {
    return {
      title: "Configuration requise (Twilio/MessageBird)",
      description:
        "Activez Phone + fournisseur SMS dans Supabase Dashboard pour envoyer les OTP.",
    };
  }

  return {
    title: "Erreur d'envoi du code",
    description: message,
  };
}

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as LoginLocationState | null)?.role;

  const isPhoneValid = isValidAlgerianMobile(phone);

  const handlePhoneChange = (value: string) => {
    setPhone(sanitizeAlgerianMobileInput(value));
  };

  const handleSendOTP = async () => {
    if (!isPhoneValid) {
      toast.error("Numero invalide", { description: ALGERIA_HELPER_TEXT });
      return;
    }

    setLoading(true);
    const fullPhone = normalizeAlgerianPhone(phone);

    if (!/^\+213[567]\d{8}$/.test(fullPhone)) {
      toast.error("Format invalide", {
        description: "Utilisez un numero mobile algerien au format +2135XXXXXXXX.",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

      if (error) {
        const otpError = buildOtpErrorMessage(error.message);
        toast.error(otpError.title, { description: otpError.description, duration: 9000 });
      } else {
        toast.success("Code envoye !");
        setStep("otp");
      }
    } catch {
      toast.error("Erreur de connexion", {
        description: "Verifiez votre connexion internet et reessayez.",
      });
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
        toast.error("Code invalide", { description: error.message });
      } else {
        toast.success("Connexion reussie !");
        navigate("/auth/profile-setup", { state: { role } });
      }
    } catch {
      toast.error("Erreur de connexion", {
        description: "Verifiez votre connexion internet et reessayez.",
      });
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f7f7f5] safe-top safe-bottom">
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
        <div className="mb-4 flex justify-center">
          <BrandLogo size="md" className="h-14" />
        </div>
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
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Numero de telephone</label>
            <div className="flex items-center rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-r border-border bg-muted/30 shrink-0">
                <span className="text-lg" role="img" aria-label="Algerie">
                  🇩🇿
                </span>
                <span className="text-sm font-semibold text-foreground">+213</span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="5X XX XX XX XX"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="flex-1 px-4 py-3 text-base bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="pr-3">
                <Smartphone className="h-5 w-5 text-emerald-500" />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{ALGERIA_HELPER_TEXT}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="text-sm font-semibold text-foreground">Code de verification</label>
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg rounded-lg border-border" />
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
              Des frais de SMS standards peuvent s'appliquer. En continuant, vous acceptez de recevoir un code de
              verification a usage unique.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
