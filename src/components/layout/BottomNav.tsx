import { Home, Package, MessageCircle, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", icon: Home, label: "Accueil" },
  { to: "/activity", icon: Package, label: "Mes Colis" },
  { to: "/messages", icon: MessageCircle, label: "Messages" },
  { to: "/profile", icon: User, label: "Profil" },
] as const;

export function BottomNav() {
  const location = useLocation();
  const { isRTL, language } = useAppLanguage();
  const items = isRTL ? [...NAV_ITEMS].reverse() : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-card/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-6xl items-center justify-around h-16 px-2">
        {items.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          const localizedLabel =
            language === "ar"
              ? label === "Accueil"
                ? "الرئيسية"
                : label === "Mes Colis"
                  ? "طرودي"
                  : label === "Messages"
                    ? "الرسائل"
                    : "الملف"
              : label;
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn("font-medium", isActive && "font-semibold")}>{localizedLabel}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
