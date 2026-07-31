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
    const page = await repo.list({ ...base, state: ["open"] });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((r) => r.state === "open")).toBe(true);
  });

  it("ANDs across dimensions", async () => {
    const page = await repo.list({
      ...base,
      state: ["open"],
      label: ["bug"],
    });
    expect(
      page.items.every(
        (r) => r.state === "open" && r.labels.some((l) => l.name === "bug"),
      ),
    ).toBe(true);
  });

  it("sorts by created asc", async () => {
    const page = await repo.list({
      ...base,
      sort: "created",
      direction: "asc",
      per_page: 100,
    });
    const times = page.items.map((r) => Date.parse(r.created_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("paginates results", async () => {
    const page1 = await repo.list({ ...base, page: 1, per_page: 5 });
    expect(page1.items.length).toBeLessThanOrEqual(5);
    expect(page1.page).toBe(1);
    expect(page1.per_page).toBe(5);
    expect(page1.total_count).toBeGreaterThan(5);
    expect(page1.total_page).toBeGreaterThan(1);
  });

  it("filters by title search", async () => {
    const page = await repo.list({
      ...base,
      search: "crash",
      per_page: 100,
    });
    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every((r) => r.title.toLowerCase().includes("crash")),
    ).toBe(true);
  });

  it("meta aggregates unique options", async () => {
    const meta = await repo.meta("demo-org", "demo-repo");
    expect(meta.states).toEqual(expect.arrayContaining(["open", "closed"]));
    expect(meta.labels.length).toBeGreaterThan(0);
  });
});
