import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  MAX_ISSUES_PAGES,
  type DashboardIssue,
  type IssueInvolvement,
} from "@/lib/dashboard/types";
import { itemKey } from "@/lib/dashboard/itemKey";
import {
  mapDashboardIssue,
  type GitCodeOrgIssueRaw,
} from "@/lib/gitcode/mapDashboardIssue";

function mapSortParam(sort: "created" | "updated"): string {
  return sort === "updated" ? "updated_at" : "created";
}

async function fetchEnterpriseIssuesPage(options: {
  token: string;
  org: string;
  stateParam: string;
  sort: "created" | "updated";
  direction: "asc" | "desc";
  signal?: AbortSignal;
  creator?: string;
  assignee?: string;
}): Promise<DashboardIssue[]> {
  const org = options.org.trim();
  const out: DashboardIssue[] = [];
  let page = 1;

  while (page <= MAX_ISSUES_PAGES) {
    const res = await fetchGitCode(`/enterprises/${org}/issues`, {
      token: options.token,
      signal: options.signal,
      searchParams: {
        creator: options.creator,
        assignee: options.assignee,
        state: options.stateParam,
        sort: mapSortParam(options.sort),
        direction: options.direction,
        page: String(page),
        per_page: "100",
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
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const item of raw) {
      const mapped = mapDashboardIssue(item, org);
      if (mapped) out.push(mapped);
    }

    if (raw.length < 100) break;
    page += 1;
  }

  return out;
}

function mergeByKey(lists: DashboardIssue[][]): DashboardIssue[] {
  const map = new Map<string, DashboardIssue>();
  for (const list of lists) {
    for (const item of list) {
      const key = itemKey(item.repo, item.number);
      if (!map.has(key)) map.set(key, item);
    }
  }
  return [...map.values()];
}

/**
 * 企业级 Issue 列表：我创建的 / 我负责的 / 二者并集。
 * GET /enterprises/{enterprise}/issues?creator= | ?assignee=
 */
export async function fetchOrgUserIssues(options: {
  token: string;
  org: string;
  username: string;
  involvement?: IssueInvolvement;
  state?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  signal?: AbortSignal;
}): Promise<DashboardIssue[]> {
  const org = options.org.trim();
  const username = options.username.trim();
  if (!org || !username) {
    throw new GitCodeHttpError(400, "org and username are required");
  }

  const stateParam =
    !options.state || options.state === "all"
      ? "all"
      : options.state === "closed"
        ? "closed"
        : "open";

  const common = {
    token: options.token,
    org,
    stateParam,
    sort: options.sort ?? ("updated" as const),
    direction: options.direction ?? ("desc" as const),
    signal: options.signal,
  };

  const involvement = options.involvement ?? "all";

  if (involvement === "created") {
    return fetchEnterpriseIssuesPage({ ...common, creator: username });
  }
  if (involvement === "assigned") {
    return fetchEnterpriseIssuesPage({ ...common, assignee: username });
  }

  const [created, assigned] = await Promise.all([
    fetchEnterpriseIssuesPage({ ...common, creator: username }),
    fetchEnterpriseIssuesPage({ ...common, assignee: username }),
  ]);
  return mergeByKey([created, assigned]);
}
