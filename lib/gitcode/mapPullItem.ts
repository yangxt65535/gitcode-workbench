import type { Pull, PullLabel, PullUser } from "@/lib/pulls/types";
import { buildPullUrl } from "@/lib/issues/detailNav";

type RawLabel = { name?: string; color?: string } | string;

type RawUser = { login?: string } | null | undefined;

type RawMilestone =
  | { title?: string; name?: string; number?: number | string }
  | string
  | null
  | undefined;

type RawBranch = { ref?: string; label?: string } | null | undefined;

export type GitCodePullItemRaw = {
  number?: number | string;
  title?: string;
  body?: string | null;
  state?: string;
  draft?: boolean;
  labels?: RawLabel[];
  milestone?: RawMilestone;
  user?: RawUser;
  assignees?: RawUser[];
  testers?: RawUser[];
  head?: RawBranch;
  base?: RawBranch;
  source_branch?: string;
  target_branch?: string;
  merged_at?: string | null;
  created_at?: string;
  updated_at?: string;
  html_url?: string;
  url?: string;
  web_url?: string;
};

function mapUser(raw: RawUser): PullUser | null {
  if (!raw || typeof raw !== "object") return null;
  const login = raw.login?.trim();
  if (!login) return null;
  return { login };
}

function mapLabels(raw: RawLabel[] | undefined): PullLabel[] {
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
    .filter((x): x is PullLabel => x != null);
}

function mapMilestone(raw: RawMilestone): {
  title: string | null;
  number: number | null;
} {
  if (raw == null) return { title: null, number: null };
  if (typeof raw === "string") {
    const title = raw.trim();
    return { title: title || null, number: null };
  }
  const title = raw.title?.trim() || raw.name?.trim() || null;
  let number: number | null = null;
  if (typeof raw.number === "number" && Number.isFinite(raw.number)) {
    number = Math.trunc(raw.number);
  } else if (typeof raw.number === "string" && /^\d+$/.test(raw.number.trim())) {
    number = Number(raw.number.trim());
  }
  return { title, number };
}

function mapRef(branch: RawBranch, fallback?: string): string {
  const ref = branch?.ref?.trim() || branch?.label?.trim();
  if (ref) return ref;
  return fallback?.trim() || "";
}

function mapNumber(raw: number | string | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return n >= 1 ? n : null;
  }
  return null;
}

export function mapGitCodePullItem(
  raw: GitCodePullItemRaw,
  org?: string,
  repo?: string,
): Pull | null {
  const number = mapNumber(raw.number);
  if (number == null) return null;

  const user = mapUser(raw.user) ?? { login: "unknown" };
  const assignees = Array.isArray(raw.assignees)
    ? raw.assignees.map(mapUser).filter((u): u is PullUser => u != null)
    : [];
  const testers = Array.isArray(raw.testers)
    ? raw.testers.map(mapUser).filter((u): u is PullUser => u != null)
    : [];
  const milestone = mapMilestone(raw.milestone);

  const apiUrl =
    (typeof raw.html_url === "string" && raw.html_url.trim()) ||
    (typeof raw.web_url === "string" && raw.web_url.trim()) ||
    (typeof raw.url === "string" && raw.url.trim()) ||
    "";
  const html_url =
    apiUrl || (org && repo ? buildPullUrl(org, repo, number) : "");

  const mergedAt =
    typeof raw.merged_at === "string" && raw.merged_at.trim()
      ? raw.merged_at
      : null;

  return {
    number,
    title: raw.title?.trim() || `PR #${number}`,
    state: (raw.state ?? "").trim() || "unknown",
    labels: mapLabels(raw.labels),
    milestone: milestone.title,
    milestone_number: milestone.number,
    user,
    assignees,
    testers,
    head_ref: mapRef(raw.head, raw.source_branch),
    base_ref: mapRef(raw.base, raw.target_branch),
    draft: Boolean(raw.draft),
    merged_at: mergedAt,
    created_at: raw.created_at || new Date(0).toISOString(),
    updated_at: raw.updated_at || raw.created_at || new Date(0).toISOString(),
    html_url,
    body: typeof raw.body === "string" ? raw.body : "",
  };
}
