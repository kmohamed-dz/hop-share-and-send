import { WILAYAS } from "@/data/wilayas";

const WILAYA_IDENTIFIERS = new Set(
  WILAYAS.flatMap((entry) => [entry.code, entry.name_fr, entry.name_ar]).map((value) =>
    value.trim().toLowerCase()
  )
);

export function isValidWilayaName(value: string): boolean {
  return WILAYA_IDENTIFIERS.has(value.trim().toLowerCase());
}

export function getWilayaIntegrityReport(): { count: number; hasDuplicates: boolean; isValid: boolean } {
  const codes = WILAYAS.map((entry) => entry.code);
  const uniqueCodes = new Set(codes);
  const isValid = WILAYAS.length === 58 && uniqueCodes.size === 58;

  return {
    count: WILAYAS.length,
    hasDuplicates: uniqueCodes.size !== codes.length,
    isValid,
  };
}
