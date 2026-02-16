import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, Car, Users, Shield, ArrowRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icons: [Package, Car, Users],
    title: "Bienvenue sur",
    titleHighlight: "MAAK",
    description:
      "La solution communautaire pour vos colis et vos trajets a travers l'Algerie.",
  },
  {
    icons: [Car],
    title: "Rentabilisez vos",
    titleHighlight: "trajets",
    description:
      "Vous voyagez ? Aidez les autres en transportant leurs colis et gagnez une recompense.",
  },
  {
    icons: [Shield],
    title: "En toute",
    titleHighlight: "confiance",
    description:
      "Systeme de notation, verification et echanges securises pour une communaute de confiance.",
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

  return (
    <div className="flex flex-col min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <span className="text-lg font-extrabold text-foreground">MAAK</span>
        <div className="px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
          FR
        </div>
      </div>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 text-center"
        key={currentSlide}
      >
        {/* Illustration area */}
        <div className="w-64 h-64 rounded-2xl bg-emerald-600/90 flex items-center justify-center mb-8 relative overflow-hidden">
          {/* Decorative map background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-800" />
          </div>
          <div className="relative flex items-center gap-2">
            {slide.icons.map((Icon, i) => (
              <div
                key={i}
                className="w-14 h-14 bg-card rounded-xl flex items-center justify-center shadow-lg"
              >
                <Icon className="h-7 w-7 text-primary" />
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">
          {slide.title}{" "}
          <span className="text-primary">{slide.titleHighlight}</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-xs leading-relaxed">
          {slide.description}
        </p>
      </div>

      <div className="px-6 pb-8 space-y-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === currentSlide ? "w-8 bg-primary" : "w-2 bg-muted"
              )}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <Button
          onClick={handleNext}
          className="w-full h-14 text-base font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2"
        >
          {currentSlide < SLIDES.length - 1 ? "Suivant" : "Commencer"}
          <ArrowRight className="h-5 w-5" />
        </Button>

        {currentSlide === 0 && (
          <button
            onClick={() => navigate("/auth/login")}
            className="w-full text-center text-sm text-muted-foreground font-medium"
          >
            {"J'ai deja un compte"} →
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-1">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Disponible partout en Algerie
          </span>
        </div>
      </div>
    </div>
  );
}
