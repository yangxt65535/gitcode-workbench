import { describe, expect, it } from "vitest";
import { issueListMetaParts } from "@/lib/issues/listItemMeta";
import { formatTime } from "@/lib/shared/formatTime";

describe("issueListMetaParts", () => {
  const issue = {
    user: { login: "alice" },
    state: "open" as const,
    labels: [{ name: "bug" }, { name: "docs" }],
    updated_at: "2026-01-10T12:00:00.000Z",
  };

  it("starts with creator and omits issue state", () => {
    const parts = issueListMetaParts(issue);
    expect(parts[0]).toBe("alice");
    expect(parts).not.toContain("open");
    expect(parts).toContain("bug, docs");
    expect(parts).toContain(formatTime(issue.updated_at));
  });
});
