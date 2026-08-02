import { describe, expect, it } from "vitest";
import { buildMetaFromPulls, matchesQuery } from "@/lib/pulls/queryLogic";
import type { Pull } from "@/lib/pulls/types";

function samplePull(partial: Partial<Pull> = {}): Pull {
  return {
    number: 1,
    title: "PR one",
    state: "open",
    labels: [{ name: "bug" }],
    milestone: "M1",
    milestone_number: 10,
    user: { login: "alice" },
    assignees: [],
    testers: [],
    head_ref: "feat",
    base_ref: "main",
    draft: false,
    merged_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: "https://gitcode.com/o/r/pulls/1",
    ...partial,
  };
}

describe("matchesQuery", () => {
  it("filters by state with opened alias", () => {
    const pull = samplePull({ state: "opened" });
    expect(matchesQuery(pull, { org: "o", repo: "r", state: ["open"] })).toBe(
      true,
    );
    expect(
      matchesQuery(pull, { org: "o", repo: "r", state: ["closed"] }),
    ).toBe(false);
  });

  it("filters by title search", () => {
    const pull = samplePull({ title: "fix login bug" });
    expect(
      matchesQuery(pull, { org: "o", repo: "r", search: "login" }),
    ).toBe(true);
    expect(
      matchesQuery(pull, { org: "o", repo: "r", search: "missing" }),
    ).toBe(false);
  });

  it("filters by creator, base, label, milestone", () => {
    const pull = samplePull();
    expect(
      matchesQuery(pull, {
        org: "o",
        repo: "r",
        creator: ["alice"],
        base: ["main"],
        label: ["bug"],
        milestone: ["M1"],
      }),
    ).toBe(true);
    expect(
      matchesQuery(pull, {
        org: "o",
        repo: "r",
        base: ["dev"],
      }),
    ).toBe(false);
  });
});

describe("buildMetaFromPulls", () => {
  it("aggregates meta options", () => {
    const meta = buildMetaFromPulls([
      samplePull(),
      samplePull({
        number: 2,
        user: { login: "bob" },
        base_ref: "dev",
        labels: [{ name: "feat" }],
        milestone: "M2",
      }),
    ]);
    expect(meta.states).toEqual(["open", "closed", "merged"]);
    expect(meta.creators).toEqual(["alice", "bob"]);
    expect(meta.baseBranches).toEqual(["dev", "main"]);
    expect(meta.labels).toEqual(["bug", "feat"]);
    expect(meta.milestones).toEqual(["M1", "M2"]);
  });
});
