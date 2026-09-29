import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "@/lib/gitcode/client";
import {
  mapGitCodePullItem,
  type GitCodePullItemRaw,
} from "@/lib/gitcode/mapPullItem";
import {
  activeFilter,
  buildMetaFromPulls,
  matchesQuery,
} from "@/lib/pulls/queryLogic";
import {
  LIST_MAX_PAGES,
  type Pull,
  type PullMeta,
  type PullQuery,
  type PullRepository,
  type PullStreamPage,
} from "@/lib/pulls/types";

const META_PAGES = 1;
const META_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 20;

function mapStateParam(states?: string[]): string {
  if (!activeFilter(states)) return "all";
  const normalized = new Set(
    states.map((s) => {
      const v = s.toLowerCase();
      if (v === "opened" || v === "open") return "open";
      return v;
    }),
  );
  if (
    normalized.has("open") &&
    normalized.has("closed") &&
    normalized.has("merged")
  ) {
    return "all";
  }
  if (normalized.size === 1) return [...normalized][0];
  return "all";
}

function firstOrUndefined(values?: string[]): string | undefined {
  return activeFilter(values) ? values[0] : undefined;
}

function listSearchParams(
  query: PullQuery,
  page: number,
  perPage: number,
): Record<string, string | undefined> {
  return {
    state: mapStateParam(query.state),
    sort: query.sort === "updated" ? "updated" : "created",
    direction: query.direction === "asc" ? "asc" : "desc",
    page: String(page),
    per_page: String(perPage),
    labels: activeFilter(query.label) ? query.label.join(",") : undefined,
    author: firstOrUndefined(query.creator),
    base: firstOrUndefined(query.base),
    search: query.search?.trim() || undefined,
  };
}

export class GitCodePullRepository implements PullRepository {
  constructor(private readonly token: string) {}

  /** 渐进式加载的单页拉取；search 由服务器过滤后再做一次客户端精确过滤。 */
  async fetchPage(
    query: PullQuery,
    page: number,
    perPage: number,
    signal?: AbortSignal,
  ): Promise<PullStreamPage> {
    const owner = query.org.trim();
    const name = query.repo.trim();
    if (!owner || !name) {
      return { items: [], rawCount: 0, perPage, capped: false };
    }

    const res = await fetchGitCode(`/repos/${owner}/${name}/pulls`, {
      token: this.token,
      searchParams: listSearchParams(query, page, perPage),
      signal,
    });

    this.assertOk(res);

    const raw = await readGitCodeJson<GitCodePullItemRaw[] | { message?: string }>(
      res,
    );
    if (!Array.isArray(raw)) {
      throw new GitCodeHttpError(502, "GitCode 返回的 Pull Requests 数据无效");
    }

    const mapped = raw
      .map((item) => mapGitCodePullItem(item, owner, name))
      .filter((x): x is Pull => x != null)
      .filter((pull) => matchesQuery(pull, query));

    return {
      items: mapped,
      rawCount: raw.length,
      perPage,
      capped: page >= LIST_MAX_PAGES && raw.length >= perPage,
    };
  }

  async meta(org: string, repo: string): Promise<PullMeta> {
    const collected: Pull[] = [];
    for (let page = 1; page <= META_PAGES; page += 1) {
      const res = await fetchGitCode(`/repos/${org.trim()}/${repo.trim()}/pulls`, {
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
      const raw = await readGitCodeJson<
        GitCodePullItemRaw[] | { message?: string }
      >(res);
      if (!Array.isArray(raw)) {
        throw new GitCodeHttpError(502, "GitCode 返回的 Pull Requests 数据无效");
      }
      for (const item of raw) {
        const mapped = mapGitCodePullItem(item, org.trim(), repo.trim());
        if (mapped) collected.push(mapped);
      }
      if (raw.length < META_PER_PAGE) break;
    }
    return buildMetaFromPulls(collected);
  }

  private assertOk(res: Response): void {
    if (res.status === 401 || res.status === 403) {
      throw new GitCodeHttpError(401, "Token 无效或权限不足");
    }
    if (res.status === 404) {
      throw new GitCodeHttpError(404, "仓库不存在或无权访问");
    }
    if (!res.ok) {
      throw new GitCodeHttpError(res.status, "无法加载 Pull Requests，请稍后重试");
    }
  }
}

export { DEFAULT_PER_PAGE };
