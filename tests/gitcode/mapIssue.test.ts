import { describe, expect, it } from "vitest";
import { mapGitCodeIssue } from "@/lib/gitcode/mapIssue";

describe("mapGitCodeIssue", () => {
  it("maps a typical GitCode issue payload", () => {
    const issue = mapGitCodeIssue({
      number: 12,
      title: "Fix crash",
      state: "open",
      labels: [{ name: "bug", color: "ff0000" }],
      milestone: { title: "v1.0" },
      issue_type: "defect",
      user: { login: "alice" },
      assignees: [{ login: "bob" }],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      html_url: "https://gitcode.com/o/r/issues/12",
    });

    expect(issue).toEqual({
      number: 12,
      title: "Fix crash",
      state: "open",
      labels: [{ name: "bug", color: "ff0000" }],
      milestone: "v1.0",
      issue_type: "defect",
      user: { login: "alice" },
      assignees: [{ login: "bob" }],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      html_url: "https://gitcode.com/o/r/issues/12",
      body: "",
    });
  });

  it("accepts string number and opened state from GitCode docs", () => {
    const issue = mapGitCodeIssue({
      number: "708",
      title: "Real shape",
      state: "opened",
      body: "hello",
      user: { login: "alice" },
      labels: [],
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      html_url: "https://gitcode.com/o/r/issues/708",
    });
    expect(issue?.number).toBe(708);
    expect(issue?.state).toBe("open");
    expect(issue?.body).toBe("hello");
  });

  it("returns null without number", () => {
    expect(mapGitCodeIssue({ title: "x" })).toBeNull();
  });
});
