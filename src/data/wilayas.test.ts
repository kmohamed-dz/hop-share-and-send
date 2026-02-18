import { describe, expect, it } from "vitest";

import { WILAYAS } from "@/data/wilayas";

describe("WILAYAS dataset", () => {
  it("has exactly 58 unique official codes", () => {
    expect(WILAYAS).toHaveLength(58);

    const codes = WILAYAS.map((entry) => entry.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(58);
  });

  it("assigns code 50 to Bordj Badji Mokhtar", () => {
    const bbm = WILAYAS.find((entry) => entry.name_fr === "Bordj Badji Mokhtar");
    expect(bbm?.code).toBe("50");
  });
});
