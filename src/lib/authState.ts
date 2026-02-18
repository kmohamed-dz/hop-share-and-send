import type { Session, User } from "@supabase/supabase-js";

export function isEmailVerifiedUser(user: User | null | undefined): boolean {
  return Boolean(user?.email && user.email_confirmed_at);
}

export function isEmailVerifiedSession(session: Session | null): boolean {
  return isEmailVerifiedUser(session?.user);
}

export function isProfileRecordComplete(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;

  const fullName = typeof profile.full_name === "string" ? profile.full_name.trim() : "";
  const wilaya = typeof profile.wilaya === "string" ? profile.wilaya.trim() : "";
  const nationalId = typeof profile.national_id === "string" ? profile.national_id.trim() : "";
  const profileCompleteFlag = typeof profile.profile_complete === "boolean" ? profile.profile_complete : null;
  const hasRequiredFields = Boolean(fullName) && Boolean(wilaya) && Boolean(nationalId);

  if (profileCompleteFlag === null) {
    return hasRequiredFields;
  }

  return profileCompleteFlag && hasRequiredFields;
}
