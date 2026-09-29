import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  MAX_ISSUES_PAGES,
  type DashboardIssue,
} from "@/lib/dashboard/types";
import {
  mapDashboardIssue,
  type GitCodeOrgIssueRaw,
} from "@/lib/gitcode/mapDashboardIssue";

function mapSortParam(sort: "created" | "updated"): string {
  return sort === "updated" ? "updated_at" : "created";
}

function mapStateParam(state?: string): string {
  if (!state || state === "all") return "all";
  if (state === "closed") return "closed";
  return "open";
}

export type OrgIssueStreamPage = {
  items: DashboardIssue[];
  /** Raw items returned by the API page (before mapping drops invalid rows). */
  rawCount: number;
  perPage: number;
  /** Stream hit the page cap while the last page was still full. */
  capped: boolean;
};

/**
 * 企业级 Issue 列表单页拉取（渐进式加载的数据源）。
 * GET /enterprises/{enterprise}/issues?creator= | ?assignee=
 */
export async function fetchOrgUserIssuesPage(options: {
  token: string;
  org: string;
  username: string;
  /** "all" 由调用方拆成 created + assigned 两个流，此处只接受单流。 */
  involvement: "created" | "assigned";
  state?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  page: number;
  perPage: number;
  signal?: AbortSignal;
}): Promise<OrgIssueStreamPage> {
  const org = options.org.trim();
  const username = options.username.trim();
  if (!org || !username) {
    throw new GitCodeHttpError(400, "org and username are required");
  }

  const res = await fetchGitCode(`/enterprises/${org}/issues`, {
    token: options.token,
    signal: options.signal,
    searchParams: {
      creator: options.involvement === "created" ? username : undefined,
      assignee: options.involvement === "assigned" ? username : undefined,
      state: mapStateParam(options.state),
      sort: mapSortParam(options.sort ?? "updated"),
      direction: options.direction ?? "desc",
      page: String(options.page),
      per_page: String(options.perPage),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法加载企业 Issues");
  }

  const raw = await readGitCodeJson<
    GitCodeOrgIssueRaw[] | { message?: string }
  >(res);
  if (!Array.isArray(raw)) {
    throw new GitCodeHttpError(502, "GitCode 返回的 Issues 数据无效");
  }

  const items: DashboardIssue[] = [];
  for (const item of raw) {
    const mapped = mapDashboardIssue(item, org);
    if (mapped) items.push(mapped);
  }

  return {
    items,
    rawCount: raw.length,
    perPage: options.perPage,
    capped:
      options.page >= MAX_ISSUES_PAGES && raw.length >= options.perPage,
  };
}
