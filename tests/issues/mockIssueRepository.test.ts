import { describe, expect, it } from "vitest";
import { MockIssueRepository } from "@/lib/issues/mockIssueRepository";

const base = {
  org: "demo-org",
  repo: "demo-repo",
  sort: "updated" as const,
  direction: "desc" as const,
};

describe("MockIssueRepository", () => {
  const repo = new MockIssueRepository();

  it("filters by state OR within dimension", async () => {
    const rows = await repo.list({ ...base, state: ["open"] });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.state === "open")).toBe(true);
  });

  it("ANDs across dimensions", async () => {
    const rows = await repo.list({
      ...base,
      state: ["open"],
      label: ["bug"],
    });
    expect(
      rows.every(
        (r) => r.state === "open" && r.labels.some((l) => l.name === "bug"),
      ),
    ).toBe(true);
  });

  it("sorts by created asc", async () => {
    const rows = await repo.list({
      ...base,
      sort: "created",
      direction: "asc",
    });
    const times = rows.map((r) => Date.parse(r.created_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("meta aggregates unique options", async () => {
    const meta = await repo.meta("demo-org", "demo-repo");
    expect(meta.states).toEqual(expect.arrayContaining(["open", "closed"]));
    expect(meta.labels.length).toBeGreaterThan(0);
  });
});
