import { describe, expect, it } from "vitest";
import { mapDashboardIssue } from "@/lib/gitcode/mapDashboardIssue";

describe("mapDashboardIssue", () => {
  it("maps repository.path into repo", () => {
    const issue = mapDashboardIssue(
      {
        number: "9",
        title: "hello",
        state: "opened",
        repository: {
          path: "e2e-auto-test",
          full_name: "openFuyao/e2e-auto-test",
        },
        user: { login: "alice" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://gitcode.com/openFuyao/e2e-auto-test/issues/9",
      },
      "openFuyao",
    );
    expect(issue?.repo).toBe("e2e-auto-test");
    expect(issue?.org).toBe("openFuyao");
    expect(issue?.state).toBe("open");
    expect(issue?.number).toBe(9);
  });

  it("returns null without repo path", () => {
    expect(mapDashboardIssue({ number: 1, title: "x" }, "o")).toBeNull();
  });
});
