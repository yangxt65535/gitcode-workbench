import type { DashboardPull } from "@/lib/dashboard/types";
import type { GitCodePullItemRaw } from "@/lib/gitcode/mapPullItem";
import { mapGitCodePullItem } from "@/lib/gitcode/mapPullItem";

/** Enterprise PR list item — repo lives under base/head; author replaces user. */
export type GitCodeEnterprisePullRaw = GitCodePullItemRaw & {
  author?: { login?: string } | null;
  base?: {
    ref?: string;
    repo?: { path?: string; namespace?: { path?: string } } | null;
  } | null;
  head?: {
    ref?: string;
    repo?: { path?: string; namespace?: { path?: string } } | null;
  } | null;
};

function resolveRepo(raw: GitCodeEnterprisePullRaw): string {
  const basePath = raw.base?.repo?.path?.trim();
  if (basePath) return basePath;
  const headPath = raw.head?.repo?.path?.trim();
  if (headPath) return headPath;
  const html = raw.html_url?.trim() || raw.url?.trim() || "";
  // https://gitcode.com/{org}/{repo}/merge_requests/{n}
  const m = html.match(/gitcode\.com\/[^/]+\/([^/]+)\//);
  return m?.[1]?.trim() || "";
}

export function mapDashboardPull(
  raw: GitCodeEnterprisePullRaw,
  org: string,
): DashboardPull | null {
  const repo = resolveRepo(raw);
  if (!repo) return null;

  const withUser: GitCodePullItemRaw = {
    ...raw,
    user: raw.user ?? raw.author ?? undefined,
  };
  const pull = mapGitCodePullItem(withUser, org, repo);
  if (!pull) return null;

  return {
    org: org.trim(),
    repo,
    number: pull.number,
    title: pull.title,
    state: pull.state,
    labels: pull.labels,
    user: pull.user,
    created_at: pull.created_at,
    updated_at: pull.updated_at,
    html_url: pull.html_url,
    draft: pull.draft,
    merged_at: pull.merged_at,
  };
}
