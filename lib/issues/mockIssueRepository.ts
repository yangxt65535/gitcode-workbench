import { MOCK_ISSUES } from "./mockData";
import {
  buildMetaFromIssues,
  matchesQuery,
  sortIssues,
} from "./queryLogic";
import type { IssueMeta, IssueQuery, IssueRepository } from "./types";

export class MockIssueRepository implements IssueRepository {
  async list(query: IssueQuery) {
    if (!query.org?.trim() || !query.repo?.trim()) {
      return [];
    }
    const filtered = MOCK_ISSUES.filter((issue) => matchesQuery(issue, query));
    return sortIssues(filtered, query.sort, query.direction);
  }

  async meta(org: string, repo: string): Promise<IssueMeta> {
    void org;
    void repo;
    return buildMetaFromIssues(MOCK_ISSUES);
  }
}
