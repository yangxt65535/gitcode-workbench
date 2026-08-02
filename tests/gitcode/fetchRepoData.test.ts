import { describe, expect, it } from "vitest";
import { isForkOfUpstream } from "@/lib/gitcode/fetchRepoData";

describe("isForkOfUpstream", () => {
  it("matches forked_from_project", () => {
    expect(
      isForkOfUpstream(
        { forked_from_project: { full_name: "openFuyao/e2e-auto-test" } },
        "openFuyao",
        "e2e-auto-test",
      ),
    ).toBe(true);
  });

  it("rejects unrelated repo", () => {
    expect(
      isForkOfUpstream(
        { forked_from_project: { full_name: "other/repo" } },
        "openFuyao",
        "e2e-auto-test",
      ),
    ).toBe(false);
  });
});
