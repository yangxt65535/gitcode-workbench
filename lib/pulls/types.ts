export interface PullLabel {
  name: string;
  color?: string;
}

export interface PullUser {
  login: string;
}

export interface Pull {
  number: number;
  title: string;
  state: string;
  labels: PullLabel[];
  milestone: string | null;
  milestone_number: number | null;
  user: PullUser;
  assignees: PullUser[];
  testers: PullUser[];
  head_ref: string;
  base_ref: string;
  draft: boolean;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  body?: string;
}

export interface PullComment {
  id: number | string;
  body: string;
  user: PullUser;
  created_at: string;
  updated_at: string;
}

export interface PullQuery {
  org: string;
  repo: string;
  state?: string[];
  creator?: string[];
  base?: string[];
  label?: string[];
  milestone?: string[];
  /** PR title keyword; forwarded as GitCode `search`. */
  search?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface PullMeta {
  states: string[];
  creators: string[];
  baseBranches: string[];
  labels: string[];
  milestones: string[];
}

/** 渐进式加载的单页结果；rawCount/capped 用于终止与页数上限判定。 */
export interface PullStreamPage {
  items: Pull[];
  rawCount: number;
  perPage: number;
  capped: boolean;
}

/** 单仓列表渐进补齐的服务器页数上限（50 页 × 20 条）。 */
export const LIST_MAX_PAGES = 50;

export interface PullRepository {
  fetchPage(
    query: PullQuery,
    page: number,
    perPage: number,
    signal?: AbortSignal,
  ): Promise<PullStreamPage>;
  meta(org: string, repo: string): Promise<PullMeta>;
}
