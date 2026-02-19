import type { Session, User } from "@supabase/supabase-js";

export function isEmailVerifiedUser(user: User | null | undefined): boolean {
  return Boolean(user?.email && user.email_confirmed_at);
}

export function isEmailVerifiedSession(session: Session | null): boolean {
  return isEmailVerifiedUser(session?.user);
}

export function isProfileRecordComplete(profile: Record<string, unknown> | null): boolean {
  if (!profile) return false;

  const schoolId = typeof profile.school_id === "string" ? profile.school_id.trim() : "";
  return Boolean(schoolId);
}
