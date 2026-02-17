import { describe, expect, it } from "vitest";
import { normalizeAlgerianPhone } from "./phone";

describe("normalizeAlgerianPhone", () => {
  it("normalizes local numbers starting with 0", () => {
    expect(normalizeAlgerianPhone("0552623560")).toBe("+213552623560");
  });

  it("keeps already normalized +213 number", () => {
    expect(normalizeAlgerianPhone("+213552623560")).toBe("+213552623560");
  });

  it("drops trunk zero when number is passed as +2130...", () => {
    expect(normalizeAlgerianPhone("+2130552623560")).toBe("+213552623560");
  });

  it("drops trunk zero when number is passed as 2130...", () => {
    expect(normalizeAlgerianPhone("2130552623560")).toBe("+213552623560");
  });

  it("normalizes spaced local input", () => {
    expect(normalizeAlgerianPhone("05 52 62 35 60")).toBe("+213552623560");
  });
});
