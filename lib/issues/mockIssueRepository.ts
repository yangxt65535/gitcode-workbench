import { MOCK_ISSUES } from "./mockData";
import {
  buildMetaFromIssues,
  matchesQuery,
  sortIssues,
} from "./queryLogic";
import { LIST_MAX_PAGES, type IssueMeta, type IssueQuery, type IssueRepository, type IssueStreamPage } from "./types";

export class MockIssueRepository implements IssueRepository {
  async fetchPage(
    query: IssueQuery,
    page: number,
    perPage: number,
  ): Promise<IssueStreamPage> {
    if (!query.org?.trim() || !query.repo?.trim()) {
      return { items: [], rawCount: 0, perPage, capped: false };
    }
    const filtered = sortIssues(
      MOCK_ISSUES.filter((issue) => matchesQuery(issue, query)),
      query.sort,
      query.direction,
    );
    const start = (page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);
    return {
      items: pageItems,
      rawCount: pageItems.length,
      perPage,
      capped: page >= LIST_MAX_PAGES && pageItems.length >= perPage,
    };
  }

  async meta(_org: string, _repo: string): Promise<IssueMeta> {
    return buildMetaFromIssues(MOCK_ISSUES);
  }
}
