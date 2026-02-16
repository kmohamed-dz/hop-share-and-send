/**
 * Normalize an Algerian phone number to E.164 format.
 *
 * Examples:
 * - 0552623560 -> +213552623560
 * - +213552623560 -> +213552623560
 * - +2130552623560 -> +213552623560
 */
export function normalizeAlgerianPhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  // Inputs that already include Algeria country code (213...)
  if (digits.startsWith("213")) {
    const localPart = digits.slice(3);

    // Trunk prefix `0` must not be kept after +213
    const normalizedLocalPart = localPart.startsWith("0") ? localPart.slice(1) : localPart;
    return `+213${normalizedLocalPart}`;
  }

  // Local Algerian mobile format (0XXXXXXXXX)
  if (digits.startsWith("0")) {
    return `+213${digits.slice(1)}`;
  }

  // Direct subscriber number without leading 0 (XXXXXXXXX)
  return `+213${digits}`;
}

