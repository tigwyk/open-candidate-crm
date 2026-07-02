import { describe, expect, test } from "bun:test";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  test("allows requests under the max", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { max: 5, windowMs: 60_000 })).toBe(true);
    }
  });

  test("blocks requests once the max is exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit(key, { max: 3, windowMs: 60_000 })).toBe(true);
    }
    expect(checkRateLimit(key, { max: 3, windowMs: 60_000 })).toBe(false);
  });

  test("resets the count after the window elapses", async () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(true);
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(true);
  });

  test("tracks separate keys independently", () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    expect(checkRateLimit(keyA, { max: 1, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit(keyA, { max: 1, windowMs: 60_000 })).toBe(false);
    expect(checkRateLimit(keyB, { max: 1, windowMs: 60_000 })).toBe(true);
  });
});

describe("getClientIp", () => {
  test("prefers the first entry of x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  test("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "9.9.9.9" });
    expect(getClientIp(headers)).toBe("9.9.9.9");
  });

  test("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
