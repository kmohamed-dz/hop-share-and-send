import type { Session, User } from "@supabase/supabase-js";

export function isEmailVerifiedUser(user: User | null | undefined): boolean {
  return Boolean(user?.email && user.email_confirmed_at);
}

export function isEmailVerifiedSession(session: Session | null): boolean {
  return isEmailVerifiedUser(session?.user);
}

export function isProfileRecordComplete(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;

  if (profile.profile_complete === true) {
    return true;
  }

  const fullName =
    typeof profile.full_name === "string"
      ? profile.full_name.trim()
      : typeof profile.name === "string"
        ? profile.name.trim()
        : "";
  const rolePreference =
    typeof profile.role_preference === "string"
      ? profile.role_preference.trim()
      : typeof profile.role_pref === "string"
        ? profile.role_pref.trim()
        : typeof profile.role === "string"
          ? profile.role.trim()
          : "";

  return Boolean(fullName && rolePreference);
}
