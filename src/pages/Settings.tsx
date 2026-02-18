import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Settings as SettingsIcon, Shield, Workflow } from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";

export default function Settings() {
  const navigate = useNavigate();

  const { language, isRTL, setLanguage, t } = useLanguage();
  return (
    <div className="mobile-page space-y-4">
      <div className="mobile-header">
        <button onClick={() => navigate(-1)} className="p-1" aria-label={t("settings.title")}>
          <ArrowLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="maak-section-title">{t("settings.title")}</h1>
      </div>
      <Card className="maak-card p-4 flex items-center gap-3">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <p className="text-sm">{t("settings.description")}</p>
      </Card>


      <Card className="maak-card p-4 space-y-3">
        <p className="text-sm font-semibold">{t("settings.language")}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              void setLanguage("fr");
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${language === "fr" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {t("settings.language_fr")}
          </button>
          <button
            onClick={() => {
              void setLanguage("ar");
            }}
            className={`rounded-xl border px-3 py-2 text-sm font-semibold ${language === "ar" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            {t("settings.language_ar")}
          </button>
        </div>
      </Card>

      <button
        onClick={() => navigate("/processus")}
        className="w-full"
      >
        <Card className="maak-card p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className={`flex items-center gap-3 ${isRTL ? "text-right" : "text-left"}`}>
            <Workflow className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">{t("settings.process_security")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.process_security_desc")}</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground ${isRTL ? "rotate-180" : ""}`} />
        </Card>
      </button>

      <button
        onClick={() => navigate("/safety")}
        className="w-full"
      >
        <Card className="maak-card p-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
          <div className={`flex items-center gap-3 ${isRTL ? "text-right" : "text-left"}`}>
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-semibold">{t("settings.report_incident")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.report_incident_desc")}</p>
            </div>
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground ${isRTL ? "rotate-180" : ""}`} />
        </Card>
      </button>
    </div>
  );
}
