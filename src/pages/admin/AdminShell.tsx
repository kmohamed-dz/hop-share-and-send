import { type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { useAppLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { to: "/admin", key: "admin.dashboard" as const },
  { to: "/admin/users", key: "admin.users" as const },
  { to: "/admin/trips", key: "admin.trips" as const },
  { to: "/admin/parcels", key: "admin.parcels" as const },
  { to: "/admin/deals", key: "admin.deals" as const },
  { to: "/admin/messages", key: "admin.messages" as const },
];

export function AdminShell({ children, currentPath, title }: { children: ReactNode; currentPath: string; title: string }) {
  const navigate = useNavigate();
  const { t } = useAppLanguage();

  return (
    <div className="mobile-page space-y-4 pb-8">
      <div className="mobile-header items-center">
        <button onClick={() => navigate(-1)} className="p-1" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="maak-section-title">{title}</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {ADMIN_LINKS.map((entry) => (
          <Link
            key={entry.to}
            to={entry.to}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold",
              currentPath === entry.to
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            )}
          >
            {t(entry.key)}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
