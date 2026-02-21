import ar from "@/i18n/ar.json";
import fr from "@/i18n/fr.json";

export type AppLanguage = "fr" | "ar";

const dictionaries = {
  ar: ar as Record<string, string>,
  fr: fr as Record<string, string>,
} as const;

export type TranslationKey = keyof typeof fr;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "ar" ? "ar" : "fr";
}

export function tLanguage(language: AppLanguage, key: TranslationKey): string {
  const langDict = dictionaries[language];
  const fallbackDict = dictionaries.fr;
  return langDict[key] ?? fallbackDict[key] ?? key;
}

export const ALL_TRANSLATIONS = dictionaries;
