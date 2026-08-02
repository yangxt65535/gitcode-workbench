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
import type {
  Pull,
  PullListPage,
  PullMeta,
  PullQuery,
  PullRepository,
} from "@/lib/pulls/types";

const META_PAGES = 1;
const META_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 20;
const MAX_DISCOVER_PAGE = 512;

type Totals = { total_count: number; total_page: number };

const totalsCache = new Map<string, Totals>();

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

function totalsCacheKey(query: PullQuery, perPage: number): string {
  return JSON.stringify({
    org: query.org.trim(),
    repo: query.repo.trim(),
    state: query.state ?? [],
    creator: query.creator ?? [],
    base: query.base ?? [],
    label: query.label ?? [],
    milestone: query.milestone ?? [],
    search: query.search?.trim() ?? "",
    sort: query.sort ?? "created",
    direction: query.direction ?? "desc",
    perPage,
  });
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

  async list(query: PullQuery): Promise<PullListPage> {
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

    const res = await fetchGitCode(`/repos/${owner}/${name}/pulls`, {
      token: this.token,
      searchParams: listSearchParams(query, page, perPage),
    });

    this.assertOk(res);

    const raw = await readGitCodeJson<GitCodePullItemRaw[] | { message?: string }>(
      res,
    );
    if (!Array.isArray(raw)) {
      throw new GitCodeHttpError(502, "GitCode 返回的 Pulls 数据无效");
    }

    const queryForPage: PullQuery = { ...query, search: undefined };
    const mapped = raw
      .map((item) => mapGitCodePullItem(item, owner, name))
      .filter((x): x is Pull => x != null)
      .filter((pull) => matchesQuery(pull, queryForPage));

    const totals = await this.resolveTotals({
      query,
      page,
      perPage,
      rawCount: raw.length,
      headerCount: parseHeaderInt(res, "total_count"),
      headerPage: parseHeaderInt(res, "total_page"),
    });

    return {
      items: mapped,
      page,
      per_page: perPage,
      total_count: totals.total_count,
      total_page: totals.total_page,
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
      const raw = await readGitCodeJson<GitCodePullItemRaw[] | { message?: string }>(
        res,
      );
      if (!Array.isArray(raw)) {
        throw new GitCodeHttpError(502, "GitCode 返回的 Pulls 数据无效");
      }
      for (const item of raw) {
        const mapped = mapGitCodePullItem(item, org.trim(), repo.trim());
        if (mapped) collected.push(mapped);
      }
      if (raw.length < META_PER_PAGE) break;
    }
    return buildMetaFromPulls(collected);
  }

  private async resolveTotals(args: {
    query: PullQuery;
    page: number;
    perPage: number;
    rawCount: number;
    headerCount: number | null;
    headerPage: number | null;
  }): Promise<Totals> {
    const { query, page, perPage, rawCount, headerCount, headerPage } = args;
    if (headerCount != null && headerPage != null) {
      const totals = { total_count: headerCount, total_page: headerPage };
      totalsCache.set(totalsCacheKey(query, perPage), totals);
      return totals;
    }

    const key = totalsCacheKey(query, perPage);
    const cached = totalsCache.get(key);
    if (cached) return cached;

    if (rawCount < perPage) {
      const totals = {
        total_page: Math.max(1, page),
        total_count: (page - 1) * perPage + rawCount,
      };
      totalsCache.set(key, totals);
      return totals;
    }

    const totals = await this.discoverTotals(query, perPage);
    totalsCache.set(key, totals);
    return totals;
  }

  private async discoverTotals(
    query: PullQuery,
    perPage: number,
  ): Promise<Totals> {
    let lo = 1;
    let hi = 2;
    while (hi <= MAX_DISCOVER_PAGE) {
      const n = await this.fetchRawPageCount(query, hi, perPage);
      if (n === 0) break;
      if (n < perPage) {
        return {
          total_page: hi,
          total_count: (hi - 1) * perPage + n,
        };
      }
      lo = hi;
      hi *= 2;
    }

    let left = lo + 1;
    let right = Math.min(hi, MAX_DISCOVER_PAGE);
    let lastFull = lo;
    let lastCount = perPage;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const n = await this.fetchRawPageCount(query, mid, perPage);
      if (n === 0) {
        right = mid - 1;
      } else {
        lastFull = mid;
        lastCount = n;
        left = mid + 1;
      }
    }

    return {
      total_page: lastFull,
      total_count: (lastFull - 1) * perPage + lastCount,
    };
  }

  private async fetchRawPageCount(
    query: PullQuery,
    page: number,
    perPage: number,
  ): Promise<number> {
    const owner = query.org.trim();
    const name = query.repo.trim();
    const res = await fetchGitCode(`/repos/${owner}/${name}/pulls`, {
      token: this.token,
      searchParams: listSearchParams(query, page, perPage),
    });
    this.assertOk(res);
    const raw = await readGitCodeJson<GitCodePullItemRaw[] | { message?: string }>(
      res,
    );
    return Array.isArray(raw) ? raw.length : 0;
  }

  private assertOk(res: Response): void {
    if (res.status === 401 || res.status === 403) {
      throw new GitCodeHttpError(401, "Token 无效或权限不足");
    }
    if (res.status === 404) {
      throw new GitCodeHttpError(404, "仓库不存在或无权访问");
    }
    if (!res.ok) {
      throw new GitCodeHttpError(res.status, "无法加载 Pulls，请稍后重试");
    }
  }
}
