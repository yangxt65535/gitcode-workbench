import { describe, expect, it } from "vitest";
import { preferFirst } from "@/lib/shared/filterUtils";

describe("preferFirst", () => {
  it("moves the preferred login to the front when present", () => {
    expect(preferFirst(["alice", "bob", "carol"], "bob")).toEqual([
      "bob",
      "alice",
      "carol",
    ]);
  });

  it("matches preferred login case-insensitively and keeps the original option", () => {
    expect(preferFirst(["Alice", "bob"], "alice")).toEqual(["Alice", "bob"]);
  });

  it("leaves options unchanged when preferred is missing or empty", () => {
    expect(preferFirst(["alice", "bob"], "carol")).toEqual(["alice", "bob"]);
    expect(preferFirst(["alice", "bob"], "")).toEqual(["alice", "bob"]);
    expect(preferFirst(["alice", "bob"], null)).toEqual(["alice", "bob"]);
  });
});
