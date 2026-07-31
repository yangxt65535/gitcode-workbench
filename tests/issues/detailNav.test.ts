import { describe, expect, it } from "vitest";
import {
  buildIssueUrl,
  canNavigate,
  indexInResults,
  neighbor,
  parseJumpNumber,
} from "@/lib/issues/detailNav";

const numbers = [10, 20, 30, 40];

describe("indexInResults", () => {
  it("returns -1 when nothing selected", () => {
    expect(indexInResults(numbers, null)).toBe(-1);
  });

  it("returns index when selected is in list", () => {
    expect(indexInResults(numbers, 30)).toBe(2);
  });

  it("returns -1 when selected is not in list", () => {
    expect(indexInResults(numbers, 99)).toBe(-1);
  });
});

describe("canNavigate", () => {
  it("disables both when nothing selected", () => {
    expect(canNavigate(numbers, null)).toEqual({ prev: false, next: false });
  });

  it("disables both when selected not in results", () => {
    expect(canNavigate(numbers, 99)).toEqual({ prev: false, next: false });
  });

  it("disables prev at start of list", () => {
    expect(canNavigate(numbers, 10)).toEqual({ prev: false, next: true });
  });

  it("disables next at end of list", () => {
    expect(canNavigate(numbers, 40)).toEqual({ prev: true, next: false });
  });

  it("enables both in the middle", () => {
    expect(canNavigate(numbers, 20)).toEqual({ prev: true, next: true });
  });

  it("disables both for single-item list", () => {
    expect(canNavigate([7], 7)).toEqual({ prev: false, next: false });
  });
});

describe("neighbor", () => {
  it("returns null when nothing selected", () => {
    expect(neighbor(numbers, null, 1)).toBeNull();
    expect(neighbor(numbers, null, -1)).toBeNull();
  });

  it("returns null when selected not in results", () => {
    expect(neighbor(numbers, 99, 1)).toBeNull();
  });

  it("returns next / prev within list", () => {
    expect(neighbor(numbers, 20, 1)).toBe(30);
    expect(neighbor(numbers, 20, -1)).toBe(10);
  });

  it("returns null at list boundaries", () => {
    expect(neighbor(numbers, 10, -1)).toBeNull();
    expect(neighbor(numbers, 40, 1)).toBeNull();
  });
});

describe("buildIssueUrl", () => {
  it("builds gitcode issue url", () => {
    expect(buildIssueUrl("openFuyao", "dashboard", 42)).toBe(
      "https://gitcode.com/openFuyao/dashboard/issues/42",
    );
  });
});

describe("parseJumpNumber", () => {
  it("accepts positive integers", () => {
    expect(parseJumpNumber("1")).toBe(1);
    expect(parseJumpNumber(" 42 ")).toBe(42);
  });

  it("rejects 0", () => {
    expect(parseJumpNumber("0")).toBeNull();
  });

  it("rejects non-digits", () => {
    expect(parseJumpNumber("abc")).toBeNull();
    expect(parseJumpNumber("")).toBeNull();
    expect(parseJumpNumber("  ")).toBeNull();
  });

  it("rejects decimals and signed numbers", () => {
    expect(parseJumpNumber("1.5")).toBeNull();
    expect(parseJumpNumber("-3")).toBeNull();
    expect(parseJumpNumber("+2")).toBeNull();
  });
});
