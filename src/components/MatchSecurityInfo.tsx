import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ChevronDown, ChevronUp, Lock, PackageCheck } from "lucide-react";

export function MatchSecurityInfo() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mt-4 rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Sécurité</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">
          <div className="flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Contact débloqué uniquement après acceptation mutuelle</p>
          </div>
          <div className="flex items-start gap-2">
            <PackageCheck className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">Vérifiez le colis à la remise</p>
          </div>
          <div className="flex gap-3 mt-1">
            <button onClick={() => navigate("/processus/contact")} className="text-xs text-primary font-semibold underline underline-offset-2">Protocole de contact</button>
            <button onClick={() => navigate("/processus/remise")} className="text-xs text-primary font-semibold underline underline-offset-2">Guide de remise</button>
          </div>
        </div>
      )}
    </div>
  );
}
