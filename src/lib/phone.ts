/**
 * Return a local Algerian mobile number (9 digits, without trunk 0).
 * Accepts user inputs like:
 * - 0552623560
 * - 552623560
 * - +213552623560
 * - +2130552623560
 * - 00213552623560
 *
 * Output example: 552623560
 */
export function sanitizeAlgerianMobileInput(input: string): string {
  let digits = input.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("213")) {
    digits = digits.slice(3);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 9);
}

export function isValidAlgerianMobile(input: string): boolean {
  return /^[567]\d{8}$/.test(sanitizeAlgerianMobileInput(input));
}

/**
 * Normalize to E.164 format.
 * Example: 0552623560 -> +213552623560
 */
export function normalizeAlgerianPhone(input: string): string {
  return `+213${sanitizeAlgerianMobileInput(input)}`;
}
