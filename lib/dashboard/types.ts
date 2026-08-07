export type DashboardIssue = {
  org: string;
  repo: string;
  number: number;
  title: string;
  state: string;
  labels: { name: string; color?: string }[];
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
};

export type DashboardPull = DashboardIssue & {
  draft?: boolean;
  merged_at?: string | null;
};

export type DashboardPaneFilters = {
  state: string[];
  label: string[];
  sort: "created" | "updated";
  direction: "asc" | "desc";
  /**
   * Issue only: whose issues to load.
   * all = created ∪ assigned; ignored on Pull pane.
   */
  involvement?: IssueInvolvement;
};

export type IssueInvolvement = "all" | "created" | "assigned";

export type DashboardSelection = {
  side: "issue" | "pull";
  repo: string;
  number: number;
};

export const DEFAULT_PANE_FILTERS: DashboardPaneFilters = {
  state: ["open"],
  label: [],
  sort: "updated",
  direction: "desc",
};

export const DEFAULT_ISSUE_PANE_FILTERS: DashboardPaneFilters = {
  ...DEFAULT_PANE_FILTERS,
  involvement: "all",
};

export const PAGE_SIZE = 20;
export const PULL_FETCH_CONCURRENCY = 5;
export const MAX_ISSUES_PAGES = 20;
export const MAX_PULL_PAGES_PER_REPO = 10;
