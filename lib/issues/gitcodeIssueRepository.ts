import { fetchGitCode, GitCodeHttpError } from "@/lib/gitcode/client";
import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import {
  buildMetaFromIssues,
  matchesQuery,
  sortIssues,
} from "@/lib/issues/queryLogic";
import type { Issue, IssueMeta, IssueQuery, IssueRepository } from "@/lib/issues/types";

const MAX_PAGES = 3;
const PER_PAGE = 100;

export class GitCodeIssueRepository implements IssueRepository {
  constructor(private readonly token: string) {}

  async list(query: IssueQuery): Promise<Issue[]> {
    const all = await this.fetchMappedIssues(query.org, query.repo);
    const filtered = all.filter((issue) => matchesQuery(issue, query));
    return sortIssues(filtered, query.sort, query.direction);
  }

  async meta(org: string, repo: string): Promise<IssueMeta> {
    const all = await this.fetchMappedIssues(org, repo);
    return buildMetaFromIssues(all);
  }

  private async fetchMappedIssues(org: string, repo: string): Promise<Issue[]> {
    const owner = org.trim();
    const name = repo.trim();
    if (!owner || !name) return [];

    const collected: Issue[] = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetchGitCode(`/repos/${owner}/${name}/issues`, {
        token: this.token,
        searchParams: {
          state: "all",
          sort: "updated",
          direction: "desc",
          page: String(page),
          per_page: String(PER_PAGE),
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new GitCodeHttpError(401, "Token 无效或权限不足");
      }
      if (res.status === 404) {
        throw new GitCodeHttpError(404, "仓库不存在或无权访问");
      }
      if (!res.ok) {
        throw new GitCodeHttpError(res.status, "无法加载 Issues，请稍后重试");
      }

      const raw = (await res.json()) as GitCodeIssueRaw[] | { message?: string };
      if (!Array.isArray(raw)) {
        throw new GitCodeHttpError(502, "GitCode 返回的 Issues 数据无效");
      }

      for (const item of raw) {
        const mapped = mapGitCodeIssue(item);
        if (mapped) collected.push(mapped);
      }

      if (raw.length < PER_PAGE) break;
    }
    return collected;
  }
}
