import { WILAYAS } from "@/data/wilayas";

const WILAYA_NAMES = new Set(WILAYAS.map((entry) => entry.name));

export function isValidWilayaName(value: string): boolean {
  return WILAYA_NAMES.has(value.trim());
}
