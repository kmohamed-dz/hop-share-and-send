export type AppLanguage = "fr" | "ar";

const TRANSLATIONS = {
  "app.loading": {
    fr: "Chargement...",
    ar: "جار التحميل...",
  },
  "auth.signup.success_title": {
    fr: "Email de confirmation envoyé",
    ar: "تم إرسال رسالة التأكيد",
  },
  "auth.signup.success_desc": {
    fr: "Email de confirmation envoyé. Vérifiez votre boîte de réception et vos spams.",
    ar: "تم إرسال رسالة التأكيد. تحقق من البريد الوارد والرسائل غير المرغوب فيها.",
  },
  "auth.verify.pending": {
    fr: "Vérification en attente",
    ar: "التحقق قيد الانتظار",
  },
  "auth.errors.generic": {
    fr: "Une erreur est survenue. Réessayez dans un instant.",
    ar: "حدث خطأ. حاول مرة أخرى بعد قليل.",
  },
  "auth.errors.invalid_credentials": {
    fr: "Email ou mot de passe incorrect.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  },
  "auth.errors.unverified_email": {
    fr: "Votre email n'est pas encore vérifié.",
    ar: "بريدك الإلكتروني غير مُؤكَّد بعد.",
  },
  "auth.errors.email_exists": {
    fr: "Cet email est déjà utilisé.",
    ar: "هذا البريد الإلكتروني مستخدم بالفعل.",
  },
  "auth.errors.rate_limited": {
    fr: "Trop de tentatives. Réessayez plus tard.",
    ar: "عدد المحاولات كبير. حاول لاحقاً.",
  },
  "auth.errors.weak_password": {
    fr: "Le mot de passe est trop faible.",
    ar: "كلمة المرور ضعيفة جداً.",
  },
  "auth.reset.title": {
    fr: "Réinitialiser le mot de passe",
    ar: "إعادة تعيين كلمة المرور",
  },
  "auth.reset.success": {
    fr: "Mot de passe mis à jour avec succès.",
    ar: "تم تحديث كلمة المرور بنجاح.",
  },
  "auth.reset.invalid_session": {
    fr: "Lien invalide ou expiré. Redemandez un nouveau lien.",
    ar: "الرابط غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.",
  },
  "home.security_banner_title": {
    fr: "CONSEIL SÉCURITÉ",
    ar: "نصيحة أمنية",
  },
  "home.security_banner_cta": {
    fr: "En savoir plus",
    ar: "المزيد",
  },
  "settings.title": {
    fr: "Paramètres",
    ar: "الإعدادات",
  },
  "settings.description": {
    fr: "Préférences de notification, confidentialité et compte (à venir).",
    ar: "تفضيلات الإشعارات والخصوصية والحساب (قريباً).",
  },
  "settings.language": {
    fr: "Langue / اللغة",
    ar: "اللغة / Langue",
  },
  "settings.language_fr": {
    fr: "Français",
    ar: "الفرنسية",
  },
  "settings.language_ar": {
    fr: "Arabe",
    ar: "العربية",
  },
  "settings.process_security": {
    fr: "Processus & sécurité",
    ar: "العملية والأمان",
  },
  "settings.process_security_desc": {
    fr: "Matching, contact, remise et traçabilité",
    ar: "المطابقة والتواصل والتسليم وإمكانية التتبع",
  },
  "settings.report_incident": {
    fr: "Signaler un incident",
    ar: "الإبلاغ عن حادث",
  },
  "settings.report_incident_desc": {
    fr: "Créer un signalement sécurité",
    ar: "إنشاء بلاغ أمني",
  },
  "admin.access_denied": {
    fr: "Accès refusé: vous n'êtes pas administrateur.",
    ar: "تم رفض الوصول: لست مشرفاً.",
  },
  "admin.dashboard": {
    fr: "Tableau de bord admin",
    ar: "لوحة تحكم المشرف",
  },
  "admin.users": {
    fr: "Utilisateurs",
    ar: "المستخدمون",
  },
  "admin.trips": {
    fr: "Trajets",
    ar: "الرحلات",
  },
  "admin.parcels": {
    fr: "Colis",
    ar: "الطرود",
  },
  "admin.deals": {
    fr: "Deals",
    ar: "الصفقات",
  },
  "admin.messages": {
    fr: "Messages",
    ar: "الرسائل",
  },
  "admin.stats.total_auth_users": {
    fr: "Utilisateurs Auth",
    ar: "مستخدمو Auth",
  },
  "admin.stats.total_profiles": {
    fr: "Profils",
    ar: "الملفات الشخصية",
  },
  "admin.stats.total_trips": {
    fr: "Trajets",
    ar: "الرحلات",
  },
  "admin.stats.total_parcels": {
    fr: "Demandes colis",
    ar: "طلبات الطرود",
  },
  "admin.stats.total_deals": {
    fr: "Deals",
    ar: "الصفقات",
  },
  "admin.stats.total_messages": {
    fr: "Messages",
    ar: "الرسائل",
  },
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS;

export function normalizeLanguage(value: string | null | undefined): AppLanguage {
  return value === "ar" ? "ar" : "fr";
}

export function tLanguage(language: AppLanguage, key: TranslationKey): string {
  const entry = TRANSLATIONS[key];
  return entry?.[language] ?? entry?.fr ?? key;
}

export const ALL_TRANSLATIONS = TRANSLATIONS;
