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
    const page = await repo.fetchPage({ ...base, state: ["open"] }, 1, 20);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((r) => r.state === "open")).toBe(true);
  });

  it("ANDs across dimensions", async () => {
    const page = await repo.fetchPage(
      { ...base, state: ["open"], label: ["bug"] },
      1,
      20,
    );
    expect(
      page.items.every(
        (r) => r.state === "open" && r.labels.some((l) => l.name === "bug"),
      ),
    ).toBe(true);
  });

  it("sorts by created asc", async () => {
    const page = await repo.fetchPage(
      { ...base, sort: "created", direction: "asc" },
      1,
      100,
    );
    const times = page.items.map((r) => Date.parse(r.created_at));
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("paginates results with rawCount reflecting the slice", async () => {
    const page1 = await repo.fetchPage(base, 1, 5);
    expect(page1.items.length).toBeLessThanOrEqual(5);
    expect(page1.rawCount).toBe(page1.items.length);
    expect(page1.perPage).toBe(5);
    const page2 = await repo.fetchPage(base, 2, 5);
    expect(page2.items.length).toBeGreaterThan(0);
  });

  it("filters by title search", async () => {
    const page = await repo.fetchPage({ ...base, search: "crash" }, 1, 100);
    expect(page.items.length).toBeGreaterThan(0);
    expect(
      page.items.every((r) => r.title.toLowerCase().includes("crash")),
    ).toBe(true);
  });

  it("returns an empty page without org or repo", async () => {
    const page = await repo.fetchPage({ ...base, org: "", repo: "" }, 1, 20);
    expect(page.items).toEqual([]);
    expect(page.rawCount).toBe(0);
    expect(page.capped).toBe(false);
  });

  it("meta aggregates unique options", async () => {
    const meta = await repo.meta("demo-org", "demo-repo");
    expect(meta.states).toEqual(expect.arrayContaining(["open", "closed"]));
    expect(meta.labels.length).toBeGreaterThan(0);
  });
});
