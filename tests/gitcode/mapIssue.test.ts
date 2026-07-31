import { describe, expect, it } from "vitest";
import { mapGitCodeIssue } from "@/lib/gitcode/mapIssue";
import { extractBearer } from "@/lib/issues/authHeader";
import { NextRequest } from "next/server";

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
    });
  });

  it("returns null without number", () => {
    expect(mapGitCodeIssue({ title: "x" })).toBeNull();
  });
});

describe("extractBearer", () => {
  it("parses Bearer token", () => {
    const req = new NextRequest("http://localhost/api/issues", {
      headers: { Authorization: "Bearer abc.def" },
    });
    expect(extractBearer(req)).toBe("abc.def");
  });

  it("returns null when missing", () => {
    const req = new NextRequest("http://localhost/api/issues");
    expect(extractBearer(req)).toBeNull();
  });
});
