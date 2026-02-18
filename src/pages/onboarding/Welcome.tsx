import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Car, ChevronDown, MapPin, Package, Shield, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ONBOARDING_FLAG_KEY } from "@/components/auth/AuthGate";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icons: [Package, Car, Users],
    title: "Bienvenue sur",
    titleHighlight: "MAAK",
    description: "La solution communautaire pour vos colis et vos trajets à travers l'Algérie.",
  },
  {
    icons: [Car],
    title: "Rentabilisez vos",
    titleHighlight: "trajets",
    description: "Vous voyagez ? Aidez les autres en transportant leurs colis et gagnez une récompense.",
  },
  {
    icons: [Shield],
    title: "En toute",
    titleHighlight: "confiance",
    description: "Système de notation, vérification et échanges sécurisés pour une communauté de confiance.",
  },
];

export default function Welcome() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
      return;
    }

    navigate("/onboarding/role");
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <MapPin className="h-5 w-5 text-primary" />
        </div>

        <BrandLogo size="sm" className="h-10" />

        <button
          onClick={() => {
            void setLanguage(language === "fr" ? "ar" : "fr");
          }}
          className="flex items-center gap-1 rounded-full border border-primary/25 px-3 py-1.5 text-sm font-semibold text-primary"
        >
          {language.toUpperCase()} <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" key={currentSlide}>
        <div className="relative mb-10 flex h-64 w-64 items-center justify-center overflow-hidden rounded-sm bg-[#1aa89e] shadow-xl shadow-emerald-900/20">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-cyan-700/35" />

          <div className="relative flex items-center gap-3">
            {slide.icons.map((Icon, i) => (
              <div
                key={`${currentSlide}-${i}`}
                className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card shadow-lg shadow-black/10"
              >
                <Icon className="h-9 w-9 text-primary" />
              </div>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-card/60 px-4 py-2 shadow-sm">
          <BrandLogo size="lg" className="h-24" />
        </div>

        <h1 className="mb-3 text-5xl font-black tracking-tight text-foreground">
          {slide.title} <span className="text-primary">{slide.titleHighlight}</span>
        </h1>
        <p className="max-w-xs text-lg leading-relaxed text-muted-foreground">{slide.description}</p>
      </div>

      <div className="space-y-6 px-6 pb-8">
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn("h-2.5 rounded-full transition-all", i === currentSlide ? "w-11 bg-primary" : "w-2.5 bg-primary/20")}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <Button onClick={handleNext} className="maak-primary-btn w-full gap-2 text-2xl font-bold">
          {currentSlide < SLIDES.length - 1 ? "Suivant" : "Commencer"}
          <ArrowRight className="h-5 w-5" />
        </Button>

        {currentSlide === 0 && (
          <button
            onClick={() => {
              localStorage.setItem(ONBOARDING_FLAG_KEY, "true");
              navigate("/auth/login");
            }}
            className="w-full text-center text-base text-muted-foreground"
          >
            J'ai déjà un compte →
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 pt-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Disponible partout en Algérie
          </span>
        </div>
      </div>
    </div>
  );
}
