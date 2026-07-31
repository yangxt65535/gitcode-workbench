import type { IssueQuery } from "./types";

export function splitCsv(v: string | null): string[] | undefined {
  if (!v || !v.trim()) return undefined;
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

  const sort = sp.get("sort") === "created" ? "created" : "updated";
  const direction = sp.get("direction") === "asc" ? "asc" : "desc";

  return {
    org,
    repo,
    state: splitCsv(sp.get("state")),
    creator: splitCsv(sp.get("creator")),
    assignee: splitCsv(sp.get("assignee")),
    label: splitCsv(sp.get("label")),
    milestone: splitCsv(sp.get("milestone")),
    type: splitCsv(sp.get("type")),
    sort,
    direction,
  };
}
