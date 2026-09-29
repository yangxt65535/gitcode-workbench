import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  MAX_PULL_PAGES_PER_REPO,
  type DashboardPull,
} from "@/lib/dashboard/types";
import {
  mapDashboardPull,
  type GitCodeEnterprisePullRaw,
} from "@/lib/gitcode/mapDashboardPull";

function mapPullStateParam(state?: string): string {
  if (!state || state === "all") return "all";
  if (state === "merged") return "merged";
  if (state === "closed") return "closed";
  return "open";
}

export type OrgPullStreamPage = {
  items: DashboardPull[];
  rawCount: number;
  perPage: number;
  capped: boolean;
};

/**
 * 企业级 PR 列表单页拉取（渐进式加载的数据源）。
 * GET /enterprises/{enterprise}/pull_requests?author=
 * @see https://docs.gitcode.com/docs/apis/get-api-v-5-enterprises-enterprise-pull-requests/
 */
export async function fetchOrgUserPullsPage(options: {
  token: string;
  org: string;
  username: string;
  state?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  page: number;
  perPage: number;
  signal?: AbortSignal;
}): Promise<OrgPullStreamPage> {
  const org = options.org.trim();
  const username = options.username.trim();
  if (!org || !username) {
    throw new GitCodeHttpError(400, "org and username are required");
  }

  const res = await fetchGitCode(`/enterprises/${org}/pull_requests`, {
    token: options.token,
    signal: options.signal,
    searchParams: {
      author: username,
      state: mapPullStateParam(options.state),
      sort: options.sort ?? "updated",
      direction: options.direction ?? "desc",
      page: String(options.page),
      per_page: String(options.perPage),
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
  if (!Array.isArray(raw)) {
    throw new GitCodeHttpError(502, "GitCode 返回的 Pull Requests 数据无效");
  }

  const items: DashboardPull[] = [];
  for (const item of raw) {
    const mapped = mapDashboardPull(item, org);
    if (mapped) items.push(mapped);
  }

  return {
    items,
    rawCount: raw.length,
    perPage: options.perPage,
    capped:
      options.page >= MAX_PULL_PAGES_PER_REPO &&
      raw.length >= options.perPage,
  };
}
