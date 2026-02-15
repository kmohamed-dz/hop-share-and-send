import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Phone } from "lucide-react";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as any)?.role;

  const formatPhone = (value: string) => {
    // Allow only digits, strip everything else
    return value.replace(/[^\d+]/g, "");
  };

  const handleSendOTP = async () => {
    if (!phone || phone.length < 9) {
      toast.error("Veuillez entrer un numéro valide");
      return;
    }

    setLoading(true);
    const fullPhone = phone.startsWith("+") ? phone : `+213${phone.replace(/^0/, "")}`;

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });

    if (error) {
      toast.error("Erreur d'envoi du code: " + error.message);
    } else {
      toast.success("Code envoyé !");
      setStep("otp");
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return;

    setLoading(true);
    const fullPhone = phone.startsWith("+") ? phone : `+213${phone.replace(/^0/, "")}`;

    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone,
      token: otp,
      type: "sms",
    });

    if (error) {
      toast.error("Code invalide: " + error.message);
    } else {
      toast.success("Connexion réussie !");
      // Check if profile exists, if not redirect to profile setup
      navigate("/profile/setup", { state: { role } });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen px-6 safe-top safe-bottom">
      {/* Header */}
      <div className="pt-4">
        <button
          onClick={() => step === "otp" ? setStep("phone") : navigate(-1)}
          className="p-2 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="pt-6 pb-8">
        <h1 className="text-2xl font-bold mb-2">
          {step === "phone" ? "Entrez votre numéro" : "Code de vérification"}
        </h1>
        <p className="text-muted-foreground">
          {step === "phone"
            ? "Nous vous enverrons un code par SMS pour vérifier votre identité."
            : `Un code à 6 chiffres a été envoyé au ${phone}`}
        </p>
      </div>

      <div className="flex-1">
        {step === "phone" ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="text-sm font-medium">+213</span>
              </div>
              <Input
                type="tel"
                placeholder="555 123 456"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="pl-20 h-12 text-base rounded-xl"
                autoFocus
              />
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg rounded-lg" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}
      </div>

      <div className="pb-8 space-y-3">
        <Button
          onClick={step === "phone" ? handleSendOTP : handleVerifyOTP}
          disabled={loading || (step === "phone" ? phone.length < 9 : otp.length !== 6)}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {loading ? "Chargement..." : step === "phone" ? "Envoyer le code" : "Vérifier"}
        </Button>

        {step === "otp" && (
          <button
            onClick={handleSendOTP}
            disabled={loading}
            className="w-full text-center text-sm text-primary font-medium"
          >
            Renvoyer le code
          </button>
        )}
      </div>
    </div>
  );
}
