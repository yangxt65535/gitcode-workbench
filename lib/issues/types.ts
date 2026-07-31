export type IssueState = "open" | "closed";

export interface IssueLabel {
  name: string;
  color?: string;
}

export interface IssueUser {
  login: string;
}

export interface Issue {
  number: number;
  title: string;
  state: IssueState;
  labels: IssueLabel[];
  milestone: string | null;
  issue_type: string;
  user: IssueUser;
  assignees: IssueUser[];
  created_at: string; // ISO
  updated_at: string; // ISO
  html_url: string;
  body?: string;
}

export interface IssueComment {
  id: number | string;
  body: string;
  user: IssueUser;
  created_at: string;
  updated_at: string;
}

/** PR linked to an issue (GitCode `/issues/{n}/pull_requests`). */
export interface RelatedPull {
  number: number;
  title: string;
  state: string;
  html_url: string;
}

export interface IssueQuery {
  org: string;
  repo: string;
  state?: string[];
  creator?: string[];
  assignee?: string[];
  label?: string[];
  milestone?: string[];
  /** Issue title keyword; forwarded as GitCode `search`. */
  search?: string;
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface IssueListPage {
  items: Issue[];
  page: number;
  per_page: number;
  total_count: number | null;
  total_page: number | null;
}

export interface IssueMeta {
  states: string[];
  creators: string[];
  assignees: string[];
  labels: string[];
  milestones: string[];
}

export interface IssueRepository {
  list(query: IssueQuery): Promise<IssueListPage>;
  meta(org: string, repo: string): Promise<IssueMeta>;
}
