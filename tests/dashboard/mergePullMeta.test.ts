import { describe, expect, it } from "vitest";
import { mergePullMeta } from "@/lib/dashboard/mergePullMeta";

describe("mergePullMeta", () => {
  it("patches state labels updated_at only", () => {
    const pull = {
      org: "o",
      repo: "r",
      number: 1,
      title: "t",
      state: "open",
      labels: [] as { name: string }[],
      user: { login: "u" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      html_url: "",
    };
    const next = mergePullMeta(pull, {
      state: "closed",
      labels: [{ name: "x" }],
      updated_at: "2026-04-01T00:00:00Z",
    });
    expect(next.state).toBe("closed");
    expect(next.labels).toEqual([{ name: "x" }]);
    expect(next.title).toBe("t");
  });
});
