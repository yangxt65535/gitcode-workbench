import type { Issue, IssueQuery } from "./types";

export function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

export function matchesQuery(issue: Issue, query: IssueQuery): boolean {
  if (activeFilter(query.state) && !query.state.includes(issue.state)) {
    return false;
  }
  if (
    activeFilter(query.creator) &&
    !query.creator.includes(issue.user.login)
  ) {
    return false;
  }
  if (
    activeFilter(query.assignee) &&
    !issue.assignees.some((a) => query.assignee!.includes(a.login))
  ) {
    return false;
  }
  if (
    activeFilter(query.label) &&
    !issue.labels.some((l) => query.label!.includes(l.name))
  ) {
    return false;
  }
  const search = query.search?.trim().toLowerCase();
  if (search && !issue.title.toLowerCase().includes(search)) {
    return false;
  }
  if (activeFilter(query.milestone)) {
    const milestone = issue.milestone;
    const hit = query.milestone.some((m) => {
      if (m === "__none__") return milestone === null;
      return milestone === m;
    });
    if (!hit) return false;
  }
  return true;
}

export function sortIssues(
  issues: Issue[],
  sort: IssueQuery["sort"] = "created",
  direction: IssueQuery["direction"] = "desc",
): Issue[] {
  const field = sort === "updated" ? "updated_at" : "created_at";
  const mul = direction === "asc" ? 1 : -1;
  return [...issues].sort((a, b) => {
    const diff = Date.parse(a[field]) - Date.parse(b[field]);
    return diff * mul;
  });
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function buildMetaFromIssues(issues: Issue[]) {
  return {
    states: ["open", "closed"] as string[],
    creators: uniqueSorted(issues.map((i) => i.user.login)),
    assignees: uniqueSorted(
      issues.flatMap((i) => i.assignees.map((a) => a.login)),
    ),
    labels: uniqueSorted(issues.flatMap((i) => i.labels.map((l) => l.name))),
    milestones: uniqueSorted(
      issues
        .map((i) => i.milestone)
        .filter((m): m is string => m != null && m !== ""),
    ),
  };
}
