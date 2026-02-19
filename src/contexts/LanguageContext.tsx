import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { fetchProfileByAuthUserId } from "@/lib/profile";
import {
  normalizeLanguage,
  tLanguage,
  type AppLanguage,
  type TranslationKey,
} from "@/i18n/language";

export const LANGUAGE_STORAGE_KEY = "maak_lang";
const LEGACY_LANGUAGE_STORAGE_KEY = "maak_language";

type LanguageContextValue = {
  isRTL: boolean;
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function applyHtmlLanguage(language: AppLanguage): void {
  if (typeof document === "undefined") return;

  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}

function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "fr";
  }

  const modern = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (modern) return normalizeLanguage(modern);

  const legacy = localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
  return normalizeLanguage(legacy);
}

function extractProfileLanguage(data: Record<string, unknown> | null): AppLanguage | null {
  const languagePreference = typeof data?.language_preference === "string" ? data.language_preference : null;
  const preferredLanguage = typeof data?.preferred_language === "string" ? data.preferred_language : null;
  const resolved = languagePreference ?? preferredLanguage;
  if (!resolved) return null;
  return normalizeLanguage(resolved);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => readStoredLanguage());

  const setLocalLanguage = useCallback((nextLanguage: AppLanguage) => {
    const normalized = normalizeLanguage(nextLanguage);
    setLanguageState(normalized);
    if (typeof window === "undefined") return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    localStorage.removeItem(LEGACY_LANGUAGE_STORAGE_KEY);
    applyHtmlLanguage(normalized);
  }, []);

  useEffect(() => {
    applyHtmlLanguage(language);
  }, [language]);

  useEffect(() => {
    let active = true;

    const syncFromProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active || !session?.user) return;

      const data = await fetchProfileByAuthUserId(session.user.id);

      if (!active) return;
      const profileLanguage = extractProfileLanguage((data as Record<string, unknown> | null) ?? null);
      if (profileLanguage) {
        setLocalLanguage(profileLanguage);
      }
    };

    void syncFromProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return;

      void fetchProfileByAuthUserId(session.user.id).then((data) => {
        const profileLanguage = extractProfileLanguage((data as Record<string, unknown> | null) ?? null);
        if (profileLanguage) {
          setLocalLanguage(profileLanguage);
        }
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
    },
    [setLocalLanguage]
  );

  const t = useCallback((key: TranslationKey) => tLanguage(language, key), [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      isRTL: language === "ar",
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useAppLanguage must be used inside LanguageProvider");
  }

  return context;
}

// Backward-compatible alias used by existing screens.
export const useLanguage = useAppLanguage;
