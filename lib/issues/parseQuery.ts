import type { IssueQuery } from "./types";

export function splitCsv(v: string | null): string[] | undefined {
  if (!v || !v.trim()) return undefined;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePositiveInt(
  raw: string | null,
  fallback: number,
  max?: number,
): number {
  if (!raw || !/^\d+$/.test(raw.trim())) return fallback;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 1) return fallback;
  if (max != null && n > max) return max;
  return n;
}

/**
 * Build IssueQuery from URLSearchParams.
 * Caller (route) should return 400 when org/repo are missing.
 */
export function parseIssueQuery(sp: URLSearchParams): IssueQuery | null {
  const org = sp.get("org")?.trim() ?? "";
  const repo = sp.get("repo")?.trim() ?? "";
  if (!org || !repo) {
    return null;
  }

  const sort = sp.get("sort") === "updated" ? "updated" : "created";
  const direction = sp.get("direction") === "asc" ? "asc" : "desc";

  return {
    org,
    repo,
    state: splitCsv(sp.get("state")),
    creator: splitCsv(sp.get("creator")),
    assignee: splitCsv(sp.get("assignee")),
    label: splitCsv(sp.get("label")),
    milestone: splitCsv(sp.get("milestone")),
    search: sp.get("search")?.trim() || undefined,
    sort,
    direction,
    page: parsePositiveInt(sp.get("page"), 1),
    per_page: parsePositiveInt(sp.get("per_page"), 20, 100),
  };
}
