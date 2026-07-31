import type { Issue, IssueLabel, IssueState, IssueUser } from "@/lib/issues/types";

type RawLabel = { name?: string; color?: string } | string;

type RawUser = { login?: string; name?: string } | null | undefined;

type RawMilestone =
  | { title?: string; name?: string }
  | string
  | null
  | undefined;

export type GitCodeIssueRaw = {
  number?: number;
  title?: string;
  state?: string;
  labels?: RawLabel[];
  milestone?: RawMilestone;
  issue_type?: string | { name?: string };
  type?: string;
  user?: RawUser;
  assignee?: RawUser;
  assignees?: RawUser[];
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  url?: string;
};

function mapUser(raw: RawUser): IssueUser | null {
  if (!raw || typeof raw !== "object") return null;
  const login = raw.login?.trim();
  if (!login) return null;
  return { login };
}

function mapLabels(raw: RawLabel[] | undefined): IssueLabel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name } : null;
      }
      const name = item.name?.trim();
      if (!name) return null;
      return { name, color: item.color };
    })
    .filter((x): x is IssueLabel => x != null);
}

function mapMilestone(raw: RawMilestone): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw.trim() || null;
  return raw.title?.trim() || raw.name?.trim() || null;
}

function mapIssueType(raw: GitCodeIssueRaw): string {
  if (typeof raw.issue_type === "string" && raw.issue_type.trim()) {
    return raw.issue_type.trim();
  }
  if (
    raw.issue_type &&
    typeof raw.issue_type === "object" &&
    raw.issue_type.name?.trim()
  ) {
    return raw.issue_type.name.trim();
  }
  if (typeof raw.type === "string" && raw.type.trim()) {
    return raw.type.trim();
  }
  return "";
}

function mapState(raw: string | undefined): IssueState {
  return raw === "closed" ? "closed" : "open";
}

export function mapGitCodeIssue(raw: GitCodeIssueRaw): Issue | null {
  if (typeof raw.number !== "number" || !Number.isFinite(raw.number)) {
    return null;
  }
  const user = mapUser(raw.user) ?? { login: "unknown" };
  const assigneesFromList = Array.isArray(raw.assignees)
    ? raw.assignees.map(mapUser).filter((u): u is IssueUser => u != null)
    : [];
  const single = mapUser(raw.assignee);
  const assignees =
    assigneesFromList.length > 0
      ? assigneesFromList
      : single
        ? [single]
        : [];

  return {
    number: raw.number,
    title: raw.title?.trim() || `(#${raw.number})`,
    state: mapState(raw.state),
    labels: mapLabels(raw.labels),
    milestone: mapMilestone(raw.milestone),
    issue_type: mapIssueType(raw),
    user,
    assignees,
    created_at: raw.created_at || new Date(0).toISOString(),
    updated_at: raw.updated_at || raw.created_at || new Date(0).toISOString(),
    html_url: raw.html_url || raw.url || "",
  };
}
