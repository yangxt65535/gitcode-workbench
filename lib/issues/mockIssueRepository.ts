import { MOCK_ISSUES } from "./mockData";
import type { Issue, IssueMeta, IssueQuery, IssueRepository } from "./types";

function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

function matchesQuery(issue: Issue, query: IssueQuery): boolean {
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
  if (activeFilter(query.type) && !query.type.includes(issue.issue_type)) {
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

function sortIssues(
  issues: Issue[],
  sort: IssueQuery["sort"] = "updated",
  direction: IssueQuery["direction"] = "desc",
): Issue[] {
  const field = sort === "created" ? "created_at" : "updated_at";
  const mul = direction === "asc" ? 1 : -1;
  return [...issues].sort((a, b) => {
    const diff = Date.parse(a[field]) - Date.parse(b[field]);
    return diff * mul;
  });
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export class MockIssueRepository implements IssueRepository {
  async list(query: IssueQuery): Promise<Issue[]> {
    // Trial mode: any non-empty org/repo shares the same mock dataset;
    // future GitCodeIssueRepository will scope results by org/repo.
    if (!query.org?.trim() || !query.repo?.trim()) {
      return [];
    }
    const filtered = MOCK_ISSUES.filter((issue) => matchesQuery(issue, query));
    return sortIssues(filtered, query.sort, query.direction);
  }

  async meta(org: string, repo: string): Promise<IssueMeta> {
    void org;
    void repo;
    return {
      states: ["open", "closed"],
      creators: uniqueSorted(MOCK_ISSUES.map((i) => i.user.login)),
      assignees: uniqueSorted(
        MOCK_ISSUES.flatMap((i) => i.assignees.map((a) => a.login)),
      ),
      labels: uniqueSorted(MOCK_ISSUES.flatMap((i) => i.labels.map((l) => l.name))),
      milestones: uniqueSorted(
        MOCK_ISSUES.map((i) => i.milestone).filter(
          (m): m is string => m != null && m !== "",
        ),
      ),
      types: uniqueSorted(MOCK_ISSUES.map((i) => i.issue_type)),
    };
  }
}
