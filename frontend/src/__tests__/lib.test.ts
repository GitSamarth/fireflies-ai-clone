import { describe, expect, it } from "vitest";
import { countMatches } from "@/components/Highlight";
import { activeIndex, formatClock, formatDuration, initials, parseServerDate } from "@/lib/format";

describe("activeIndex", () => {
  const starts = [0, 1000, 5000, 9000];
  it("returns last segment starting at or before t", () => {
    expect(activeIndex(starts, 0)).toBe(0);
    expect(activeIndex(starts, 999)).toBe(0);
    expect(activeIndex(starts, 1000)).toBe(1);
    expect(activeIndex(starts, 8999)).toBe(2);
    expect(activeIndex(starts, 10 ** 9)).toBe(3);
  });
  it("handles before-first and empty", () => {
    expect(activeIndex([500, 900], 100)).toBe(-1);
    expect(activeIndex([], 100)).toBe(-1);
  });
});

describe("format", () => {
  it("formatClock", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65_000)).toBe("1:05");
    expect(formatClock(3_725_000)).toBe("1:02:05");
    expect(formatClock(-5)).toBe("0:00");
  });
  it("formatDuration", () => {
    expect(formatDuration(30_000)).toBe("30 sec");
    expect(formatDuration(137_000)).toBe("2 min");
    expect(formatDuration(3_900_000)).toBe("1 hr 5 min");
  });
  it("treats zone-less server timestamps as UTC", () => {
    expect(parseServerDate("2026-01-01T10:00:00").toISOString()).toBe("2026-01-01T10:00:00.000Z");
    expect(parseServerDate("2026-01-01T10:00:00Z").toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });
  it("initials", () => { expect(initials("Sarah Chen")).toBe("SC"); expect(initials("  ")).toBe("?"); expect(initials("Cher")).toBe("C"); });
});

describe("countMatches", () => {
  it("is case-insensitive and non-overlapping", () => { expect(countMatches("Price price PRICE", "price")).toBe(3); expect(countMatches("aaaa", "aa")).toBe(2); });
  it("treats regex metacharacters literally", () => { expect(countMatches("cost (usd) $5.00", "(usd)")).toBe(1); expect(countMatches("a.b", ".")).toBe(1); expect(countMatches("abc", ".")).toBe(0); });
  it("empty term never matches", () => expect(countMatches("abc", "")).toBe(0));
});
