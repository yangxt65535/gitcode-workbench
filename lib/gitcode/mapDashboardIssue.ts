import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import type { DashboardIssue } from "@/lib/dashboard/types";

export type GitCodeOrgIssueRaw = GitCodeIssueRaw & {
  repository?: {
    path?: string;
    name?: string;
    full_name?: string;
  } | null;
};

function resolveRepoPath(raw: GitCodeOrgIssueRaw): string {
  const path = raw.repository?.path?.trim();
  if (path) return path;
  const name = raw.repository?.name?.trim();
  if (name) return name;
  const full = raw.repository?.full_name?.trim();
  if (full) {
    const parts = full.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1]!;
  }
  return "";
}

export function mapDashboardIssue(
  raw: GitCodeOrgIssueRaw,
  org: string,
): DashboardIssue | null {
  const repo = resolveRepoPath(raw);
  if (!repo) return null;
  const issue = mapGitCodeIssue(raw);
  if (!issue) return null;
  return {
    org: org.trim(),
    repo,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    labels: issue.labels,
    user: issue.user,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    html_url: issue.html_url,
  };
}
