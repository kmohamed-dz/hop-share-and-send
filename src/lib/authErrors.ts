import type { AppLanguage } from "@/i18n/language";
import { tLanguage } from "@/i18n/language";

type FriendlyAuthError = {
  description: string;
  title: string;
};

type AuthErrorContext = "login" | "signup" | "verify" | "reset" | "callback";

function resolveMappedDescription(rawMessage: string, language: AppLanguage): string {
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return tLanguage(language, "auth.errors.invalid_credentials");
  }

  if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
    return tLanguage(language, "auth.errors.unverified_email");
  }

  if (normalized.includes("user already registered") || normalized.includes("already registered")) {
    return tLanguage(language, "auth.errors.email_exists");
  }

  if (normalized.includes("too many") || normalized.includes("rate limit")) {
    return tLanguage(language, "auth.errors.rate_limited");
  }

  if (normalized.includes("password") && (normalized.includes("weak") || normalized.includes("short"))) {
    return tLanguage(language, "auth.errors.weak_password");
  }

  if (normalized.includes("invalid api key") || normalized.includes("apikey")) {
    return language === "ar"
      ? "إعدادات Supabase غير صحيحة. تحقق من VITE_SUPABASE_ANON_KEY."
      : "Configuration Supabase invalide. Vérifiez VITE_SUPABASE_ANON_KEY.";
  }

  return tLanguage(language, "auth.errors.generic");
}

export function toFriendlyAuthError(
  context: AuthErrorContext,
  language: AppLanguage,
  rawMessage: string
): FriendlyAuthError {
  const defaultTitleByContext: Record<AuthErrorContext, string> = {
    callback: language === "ar" ? "خطأ في المصادقة" : "Erreur d'authentification",
    login: language === "ar" ? "فشل تسجيل الدخول" : "Connexion impossible",
    reset: language === "ar" ? "فشل إعادة التعيين" : "Réinitialisation impossible",
    signup: language === "ar" ? "فشل إنشاء الحساب" : "Inscription impossible",
    verify: language === "ar" ? "فشل التحقق" : "Vérification impossible",
  };

  return {
    title: defaultTitleByContext[context],
    description: resolveMappedDescription(rawMessage, language),
  };
}

export function logTechnicalAuthError(context: AuthErrorContext, error: unknown): void {
  console.error(`[auth:${context}]`, error);
}
