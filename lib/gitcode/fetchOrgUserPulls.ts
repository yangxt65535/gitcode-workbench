import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import { MAX_PULL_PAGES_PER_REPO, type DashboardPull } from "@/lib/dashboard/types";
import {
  mapDashboardPull,
  type GitCodeEnterprisePullRaw,
} from "@/lib/gitcode/mapDashboardPull";

export type FetchOrgUserPullsResult = {
  items: DashboardPull[];
  warnings: string[];
};

function mapPullStateParam(state?: string): string {
  if (!state || state === "all") return "all";
  if (state === "merged") return "merged";
  if (state === "closed") return "closed";
  return "open";
}

/**
 * 企业级 PR 列表（一次拉齐，不再按仓扫描）。
 * GET /enterprises/{enterprise}/pull_requests?author=
 * 可选 repo= 限定单仓。
 * @see https://docs.gitcode.com/docs/apis/get-api-v-5-enterprises-enterprise-pull-requests/
 */
export async function fetchOrgUserPulls(options: {
  token: string;
  org: string;
  username: string;
  /** 单仓时下推到 API；多仓/全部时不传，由调用方客户端过滤 */
  repo?: string;
  state?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  signal?: AbortSignal;
}): Promise<FetchOrgUserPullsResult> {
  const org = options.org.trim();
  const username = options.username.trim();
  if (!org || !username) {
    throw new GitCodeHttpError(400, "org and username are required");
  }

  const out: DashboardPull[] = [];
  let page = 1;

  while (page <= MAX_PULL_PAGES_PER_REPO) {
    const res = await fetchGitCode(`/enterprises/${org}/pull_requests`, {
      token: options.token,
      signal: options.signal,
      searchParams: {
        author: username,
        state: mapPullStateParam(options.state),
        sort: options.sort ?? "updated",
        direction: options.direction ?? "desc",
        page: String(page),
        per_page: "100",
        repo: options.repo?.trim() || undefined,
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new GitCodeHttpError(401, "Token 无效或权限不足");
    }
    if (!res.ok) {
      throw new GitCodeHttpError(res.status, "无法加载企业 Pull Requests");
    }

    const raw = await readGitCodeJson<
      GitCodeEnterprisePullRaw[] | { message?: string }
    >(res);
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const item of raw) {
      const mapped = mapDashboardPull(item, org);
      if (mapped) out.push(mapped);
    }

    if (raw.length < 100) break;
    page += 1;
  }

  return { items: out, warnings: [] };
}
