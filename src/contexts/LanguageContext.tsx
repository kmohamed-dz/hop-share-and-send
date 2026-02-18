import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppLanguage = "fr" | "ar";

const LANGUAGE_STORAGE_KEY = "maak_language";

type LanguageContextValue = {
  isRTL: boolean;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "ar" ? "ar" : "fr";
}

function applyHtmlLanguage(language: AppLanguage): void {
  if (typeof document === "undefined") return;

  const dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
  document.documentElement.dir = dir;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>("fr");

  const setLocalLanguage = useCallback((nextLanguage: AppLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    applyHtmlLanguage(normalized);
  }, []);

  useEffect(() => {
    const stored = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    setLocalLanguage(stored);
  }, [setLocalLanguage]);

  useEffect(() => {
    let active = true;

    const syncFromProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.user) return;

      const { data } = await supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      const preferred = normalizeLanguage((data as { preferred_language?: string | null } | null)?.preferred_language);
      setLocalLanguage(preferred);
    };

    syncFromProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;

      void supabase
        .from("profiles")
        .select("preferred_language")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          const preferred = normalizeLanguage((data as { preferred_language?: string | null } | null)?.preferred_language);
          setLocalLanguage(preferred);
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [setLocalLanguage]);

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage) => {
      const normalized = normalizeLanguage(nextLanguage);
      setLocalLanguage(normalized);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      await supabase
        .from("profiles")
        .update({ preferred_language: normalized })
        .eq("user_id", user.id);
    },
    [setLocalLanguage]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      isRTL: language === "ar",
      language,
      setLanguage,
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
