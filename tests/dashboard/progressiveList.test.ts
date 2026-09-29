import { describe, expect, it } from "vitest";
import {
  mergeDashboardItems,
  serverPageForDisplayPage,
} from "@/lib/dashboard/progressiveList";
import type { DashboardIssue } from "@/lib/dashboard/types";

const defaultKey = (i: DashboardIssue) => `${i.repo}#${i.number}`;

function makeIssue(repo: string, number: number): DashboardIssue {
  return {
    org: "org-a",
    repo,
    number,
    title: `issue ${repo}#${number}`,
    state: "open",
    labels: [],
    user: { login: "alice" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: `https://gitcode.com/org-a/${repo}/issues/${number}`,
  };
}

describe("serverPageForDisplayPage", () => {
  it("maps display pages to server pages", () => {
    // pageSize 20, serverPerPage 100 → 5 display pages per server page
    expect(serverPageForDisplayPage(1, 20, 100)).toBe(1);
    expect(serverPageForDisplayPage(5, 20, 100)).toBe(1);
    expect(serverPageForDisplayPage(6, 20, 100)).toBe(2);
    expect(serverPageForDisplayPage(25, 20, 100)).toBe(5);
    expect(serverPageForDisplayPage(26, 20, 100)).toBe(6);
  });

  it("clamps non-positive pages to 1", () => {
    expect(serverPageForDisplayPage(0, 20, 100)).toBe(1);
    expect(serverPageForDisplayPage(-3, 20, 100)).toBe(1);
  });

  it("handles per-page sizes larger than the server page", () => {
    expect(serverPageForDisplayPage(1, 50, 20)).toBe(3);
    expect(serverPageForDisplayPage(2, 50, 20)).toBe(5);
  });
});

describe("mergeDashboardItems", () => {
  it("returns empty for no lists", () => {
    expect(mergeDashboardItems([], defaultKey)).toEqual([]);
  });

  it("keeps order within a single list", () => {
    const a = [makeIssue("r1", 1), makeIssue("r1", 2)];
    expect(mergeDashboardItems([a], defaultKey)).toEqual(a);
  });

  it("dedupes by repo#number across lists, earlier list wins", () => {
    const created1 = makeIssue("r1", 1);
    const created2 = makeIssue("r2", 2);
    const assignedDup = makeIssue("r1", 1);
    assignedDup.title = "assigned copy";
    const assigned3 = makeIssue("r3", 3);

    const merged = mergeDashboardItems([[created1, created2], [assignedDup, assigned3]], defaultKey);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toBe(created1);
    expect(merged[1]).toBe(created2);
    expect(merged[2]).toBe(assigned3);
  });

  it("keeps distinct items with the same number in different repos", () => {
    const a = makeIssue("r1", 7);
    const b = makeIssue("r2", 7);
    const merged = mergeDashboardItems([[a], [b]], defaultKey);
    expect(merged).toEqual([a, b]);
  });

  it("treats empty lists as no-ops", () => {
    const a = makeIssue("r1", 1);
    expect(mergeDashboardItems([[], [a], []], defaultKey)).toEqual([a]);
  });
});
