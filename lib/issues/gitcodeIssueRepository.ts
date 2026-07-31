import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "@/lib/gitcode/client";
import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import {
  activeFilter,
  buildMetaFromIssues,
  matchesQuery,
} from "@/lib/issues/queryLogic";
import type {
  Issue,
  IssueListPage,
  IssueMeta,
  IssueQuery,
  IssueRepository,
} from "@/lib/issues/types";

const META_PAGES = 1;
const META_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 20;

function parseHeaderInt(res: Response, name: string): number | null {
  const raw = res.headers.get(name) ?? res.headers.get(name.toLowerCase());
  if (!raw || !/^\d+$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

function mapStateParam(states?: string[]): string {
  if (!activeFilter(states)) return "all";
  const normalized = new Set(
    states.map((s) => {
      const v = s.toLowerCase();
      if (v === "closed" || v === "close") return "closed";
      return "open";
    }),
  );
  if (normalized.has("open") && normalized.has("closed")) return "all";
  if (normalized.has("closed")) return "closed";
  return "open";
}

function firstOrUndefined(values?: string[]): string | undefined {
  return activeFilter(values) ? values[0] : undefined;
}

export class GitCodeIssueRepository implements IssueRepository {
  constructor(private readonly token: string) {}

  async list(query: IssueQuery): Promise<IssueListPage> {
    const owner = query.org.trim();
    const name = query.repo.trim();
    const page = query.page ?? 1;
    const perPage = query.per_page ?? DEFAULT_PER_PAGE;
    if (!owner || !name) {
      return {
        items: [],
        page: 1,
        per_page: perPage,
        total_count: 0,
        total_page: 0,
      };
    }

    const res = await fetchGitCode(`/repos/${owner}/${name}/issues`, {
      token: this.token,
      searchParams: {
        state: mapStateParam(query.state),
        sort: query.sort === "updated" ? "updated" : "created",
        direction: query.direction === "asc" ? "asc" : "desc",
        page: String(page),
        per_page: String(perPage),
        labels: activeFilter(query.label) ? query.label.join(",") : undefined,
        assignee: firstOrUndefined(query.assignee),
        creator: firstOrUndefined(query.creator),
        milestone: firstOrUndefined(query.milestone),
        search: query.search?.trim() || undefined,
      },
    });

    this.assertOk(res);

    const raw = await readGitCodeJson<GitCodeIssueRaw[] | { message?: string }>(
      res,
    );
    if (!Array.isArray(raw)) {
      throw new GitCodeHttpError(502, "GitCode 返回的 Issues 数据无效");
    }

    // Search is already applied by GitCode; skip title post-filter.
    // Remaining matchesQuery covers multi-select leftovers not fully pushed.
    const queryForPage: IssueQuery = { ...query, search: undefined };
    const mapped = raw
      .map((item) => mapGitCodeIssue(item))
      .filter((x): x is Issue => x != null)
      .filter((issue) => matchesQuery(issue, queryForPage));

    return {
      items: mapped,
      page,
      per_page: perPage,
      total_count: parseHeaderInt(res, "total_count"),
      total_page: parseHeaderInt(res, "total_page"),
    };
  }

  async meta(org: string, repo: string): Promise<IssueMeta> {
    const collected: Issue[] = [];
    for (let page = 1; page <= META_PAGES; page += 1) {
      const res = await fetchGitCode(`/repos/${org.trim()}/${repo.trim()}/issues`, {
        token: this.token,
        searchParams: {
          state: "all",
          sort: "updated",
          direction: "desc",
          page: String(page),
          per_page: String(META_PER_PAGE),
        },
      });
      this.assertOk(res);
      const raw = await readGitCodeJson<GitCodeIssueRaw[] | { message?: string }>(
        res,
      );
      if (!Array.isArray(raw)) {
        throw new GitCodeHttpError(502, "GitCode 返回的 Issues 数据无效");
      }
      for (const item of raw) {
        const mapped = mapGitCodeIssue(item);
        if (mapped) collected.push(mapped);
      }
      if (raw.length < META_PER_PAGE) break;
    }
    return buildMetaFromIssues(collected);
  }

  private assertOk(res: Response): void {
    if (res.status === 401 || res.status === 403) {
      throw new GitCodeHttpError(401, "Token 无效或权限不足");
    }
    if (res.status === 404) {
      throw new GitCodeHttpError(404, "仓库不存在或无权访问");
    }
    if (!res.ok) {
      throw new GitCodeHttpError(res.status, "无法加载 Issues，请稍后重试");
    }
  }
}
