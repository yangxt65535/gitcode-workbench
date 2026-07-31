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
}

export interface IssueQuery {
  org: string;
  repo: string;
  state?: string[];
  creator?: string[];
  assignee?: string[];
  label?: string[];
  milestone?: string[];
  type?: string[];
  sort?: "created" | "updated";
  direction?: "asc" | "desc";
}

export interface IssueMeta {
  states: string[];
  creators: string[];
  assignees: string[];
  labels: string[];
  milestones: string[];
  types: string[];
}

export interface IssueRepository {
  list(query: IssueQuery): Promise<Issue[]>;
  meta(org: string, repo: string): Promise<IssueMeta>;
}
