import { describe, expect, it } from "vitest";
import { itemKey, parseItemKey } from "@/lib/dashboard/itemKey";

describe("itemKey", () => {
  it("round-trips repo and number", () => {
    expect(itemKey("e2e-auto-test", 12)).toBe("e2e-auto-test#12");
    expect(parseItemKey("e2e-auto-test#12")).toEqual({
      repo: "e2e-auto-test",
      number: 12,
    });
  });

  it("returns null for invalid keys", () => {
    expect(parseItemKey("")).toBeNull();
    expect(parseItemKey("nohash")).toBeNull();
    expect(parseItemKey("repo#0")).toBeNull();
  });
});
