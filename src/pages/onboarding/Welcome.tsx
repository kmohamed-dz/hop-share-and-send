import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, Route, Shield } from "lucide-react";

const SLIDES = [
  {
    icon: Package,
    title: "Envoyez vos colis facilement",
    description: "Trouvez des voyageurs qui font déjà le trajet pour transporter vos colis en toute sécurité.",
  },
  {
    icon: Route,
    title: "Rentabilisez vos trajets",
    description: "Vous voyagez ? Aidez les autres en transportant leurs colis et gagnez une récompense.",
  },
  {
    icon: Shield,
    title: "En toute confiance",
    description: "Système de notation, vérification et échanges sécurisés pour une communauté de confiance.",
  },
];

export default function Welcome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigate("/onboarding/role");
    }
  };

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="flex flex-col min-h-screen px-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in" key={currentSlide}>
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold mb-3">{slide.title}</h1>
        <p className="text-muted-foreground text-base max-w-xs">{slide.description}</p>
      </div>

      <div className="pb-8 space-y-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn("h-2 rounded-full transition-all", i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted")}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="w-full h-12 text-base font-semibold rounded-xl">
          {currentSlide < SLIDES.length - 1 ? "Suivant" : "Commencer"}
        </Button>

        {currentSlide === 0 && (
          <button
            onClick={() => navigate("/auth/login")}
            className="w-full text-center text-sm text-muted-foreground"
          >
            J'ai déjà un compte
          </button>
        )}
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
