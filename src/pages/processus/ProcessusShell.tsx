import { type ReactNode } from "react";
import { ArrowLeft, ListTree } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ProcessusShellProps {
  title: string;
  subtitle?: string;
  showHubLink?: boolean;
  children: ReactNode;
  className?: string;
}

export function ProcessusShell({
  title,
  subtitle,
  showHubLink = false,
  children,
  className,
}: ProcessusShellProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="maak-shell safe-top pb-8">
        <div className="pt-6 pb-4 flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {showHubLink && (
            <Link to="/processus" className="maak-secondary-link text-xs whitespace-nowrap mt-0.5">
              <ListTree className="h-3.5 w-3.5" />
              Sommaire
            </Link>
          )}
        </div>
        <div className={cn("space-y-4", className)}>{children}</div>
      </div>
    </div>
  );
}
