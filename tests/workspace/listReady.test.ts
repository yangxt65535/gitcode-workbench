import { describe, expect, it } from "vitest";
import {
  isConfirmedRepoListReady,
  repoDraftFromWorkspace,
} from "@/lib/workspace/listReady";

describe("isConfirmedRepoListReady", () => {
  it("is not ready when stored org/repo exist but this session has not confirmed", () => {
    expect(
      isConfirmedRepoListReady({
        org: "openFuyao",
        repo: "e2e-auto-test",
        repoConfirmed: false,
      }),
    ).toBe(false);
  });

  it("is ready only after this-session confirm with both org and repo", () => {
    expect(
      isConfirmedRepoListReady({
        org: "openFuyao",
        repo: "e2e-auto-test",
        repoConfirmed: true,
      }),
    ).toBe(true);
  });

  it("is not ready when confirm is missing org or repo", () => {
    expect(
      isConfirmedRepoListReady({
        org: "openFuyao",
        repo: "",
        repoConfirmed: true,
      }),
    ).toBe(false);
  });
});

describe("repoDraftFromWorkspace", () => {
  it("does not retain last repo until the user confirms this session", () => {
    expect(repoDraftFromWorkspace("e2e-auto-test", false)).toBe("");
  });

  it("keeps the confirmed repo after this-session confirm", () => {
    expect(repoDraftFromWorkspace("e2e-auto-test", true)).toBe("e2e-auto-test");
  });
});
