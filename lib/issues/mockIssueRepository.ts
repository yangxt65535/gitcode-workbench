import { MOCK_ISSUES } from "./mockData";
import {
  buildMetaFromIssues,
  matchesQuery,
  sortIssues,
} from "./queryLogic";
import type {
  IssueListPage,
  IssueMeta,
  IssueQuery,
  IssueRepository,
} from "./types";

export class MockIssueRepository implements IssueRepository {
  async list(query: IssueQuery): Promise<IssueListPage> {
    if (!query.org?.trim() || !query.repo?.trim()) {
      return {
        items: [],
        page: 1,
        per_page: query.per_page ?? 20,
        total_count: 0,
        total_page: 0,
      };
    }
    const filtered = sortIssues(
      MOCK_ISSUES.filter((issue) => matchesQuery(issue, query)),
      query.sort,
      query.direction,
    );
    const perPage = query.per_page ?? 20;
    const page = query.page ?? 1;
    const total_count = filtered.length;
    const total_page = Math.max(1, Math.ceil(total_count / perPage));
    const safePage = Math.min(page, total_page);
    const start = (safePage - 1) * perPage;
    return {
      items: filtered.slice(start, start + perPage),
      page: safePage,
      per_page: perPage,
      total_count,
      total_page,
    };
  }

  async meta(org: string, repo: string): Promise<IssueMeta> {
    void org;
    void repo;
    return buildMetaFromIssues(MOCK_ISSUES);
  }
}
