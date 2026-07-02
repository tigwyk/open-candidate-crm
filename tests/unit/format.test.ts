import { describe, expect, test } from "bun:test";
import { formatCurrency, initials, fullName } from "@/lib/format";

describe("formatCurrency", () => {
  test("formats whole dollars with no decimals", () => {
    expect(formatCurrency(150000)).toBe("$1,500");
  });

  test("rounds fractional cents", () => {
    expect(formatCurrency(150050)).toBe("$1,501");
  });

  test("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("initials", () => {
  test("combines first and last initial", () => {
    expect(initials("Jordan", "Avery")).toBe("JA");
  });

  test("handles missing last name", () => {
    expect(initials("Jordan", undefined)).toBe("J");
  });

  test("falls back when both are missing", () => {
    expect(initials(undefined, undefined)).toBe("?");
  });
});

describe("fullName", () => {
  test("joins first and last", () => {
    expect(fullName("Jordan", "Avery")).toBe("Jordan Avery");
  });

  test("falls back to Unknown when both are missing", () => {
    expect(fullName(undefined, undefined)).toBe("Unknown");
  });
});
