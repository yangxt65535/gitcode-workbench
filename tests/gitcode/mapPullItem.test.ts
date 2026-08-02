import { describe, expect, it } from "vitest";
import { mapGitCodePullItem } from "@/lib/gitcode/mapPullItem";

describe("mapGitCodePullItem", () => {
  it("maps full pull item", () => {
    const pull = mapGitCodePullItem(
      {
        number: 12,
        title: "feat: add pulls workbench",
        state: "opened",
        draft: false,
        user: { login: "alice" },
        assignees: [{ login: "bob" }],
        testers: [{ login: "carol" }],
        head: { ref: "feature/pulls" },
        base: { ref: "main" },
        labels: [{ name: "enhancement", color: "#008672" }],
        milestone: { title: "v1.0", number: 73008 },
        merged_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://gitcode.com/o/r/pulls/12",
        body: "PR body",
      },
      "o",
      "r",
    );
    expect(pull).toEqual({
      number: 12,
      title: "feat: add pulls workbench",
      state: "opened",
      labels: [{ name: "enhancement", color: "#008672" }],
      milestone: "v1.0",
      milestone_number: 73008,
      user: { login: "alice" },
      assignees: [{ login: "bob" }],
      testers: [{ login: "carol" }],
      head_ref: "feature/pulls",
      base_ref: "main",
      draft: false,
      merged_at: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      html_url: "https://gitcode.com/o/r/pulls/12",
      body: "PR body",
    });
  });

  it("falls back to source/target branch fields", () => {
    const pull = mapGitCodePullItem({
      number: "3",
      title: "fix",
      state: "merged",
      source_branch: "dev",
      target_branch: "main",
    });
    expect(pull?.head_ref).toBe("dev");
    expect(pull?.base_ref).toBe("main");
  });

  it("returns null without number", () => {
    expect(mapGitCodePullItem({ title: "x" })).toBeNull();
  });
});
