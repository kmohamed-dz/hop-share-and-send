import { describe, expect, it } from "vitest";
import {
  isValidAlgerianMobile,
  normalizeAlgerianPhone,
  sanitizeAlgerianMobileInput,
} from "./phone";

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

  it("normalizes 00213 international input", () => {
    expect(normalizeAlgerianPhone("00213 552 62 35 60")).toBe("+213552623560");
  });

  it("sanitizes pasted +213 input to local 9 digits", () => {
    expect(sanitizeAlgerianMobileInput("+2130552623560")).toBe("552623560");
  });

  it("validates only Algerian mobile patterns", () => {
    expect(isValidAlgerianMobile("552623560")).toBe(true);
    expect(isValidAlgerianMobile("152623560")).toBe(false);
  });
});
