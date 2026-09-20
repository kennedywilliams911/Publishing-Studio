import { describe, expect, it } from "vitest";
import {
  checkRateLimit,
  extractPlainText,
  isValidEmail,
  parsePagination,
} from "./helpers";

describe("helpers", () => {
  it("accepts normal emails and rejects malformed values", () => {
    expect(isValidEmail("reader@example.org")).toBe(true);
    expect(isValidEmail("reader@example")).toBe(false);
    expect(isValidEmail("reader example.org")).toBe(false);
  });

  it("bounds pagination values", () => {
    expect(parsePagination("500", "-3", 12, 100)).toEqual({
      limit: 100,
      offset: 0,
    });
    expect(parsePagination(undefined, undefined)).toEqual({
      limit: 12,
      offset: 0,
    });
  });

  it("extracts readable text from article HTML", () => {
    expect(extractPlainText("<p>Hello</p><p>world</p>")).toBe("Hello world");
  });

  it("enforces a request limit within a window", () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });
});
