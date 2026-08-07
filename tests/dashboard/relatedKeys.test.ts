import { describe, expect, it } from "vitest";
import { relatedKeysFromLinks } from "@/lib/dashboard/relatedKeys";

describe("relatedKeysFromLinks", () => {
  it("uses link repo when present else fallback", () => {
    const set = relatedKeysFromLinks(
      [{ number: 3 }, { repo: "other", number: 4 }],
      "main-repo",
    );
    expect(set.has("main-repo#3")).toBe(true);
    expect(set.has("other#4")).toBe(true);
  });
});
