export interface RepoCommit {
  sha: string;
  short_sha: string;
  message: string;
  author_login: string;
  author_date: string;
  html_url: string;
}

export interface RepoBranch {
  name: string;
}

export interface ForkInfo {
  org: string;
  repo: string;
  full_name: string;
  html_url: string;
  owner_login: string;
}

export type CommitDiffKind = "shared" | "upstream_only" | "fork_only";

export interface ClassifiedCommit {
  commit: RepoCommit;
  kind: CommitDiffKind;
}

export interface CommitDiffSummary {
  shared: number;
  upstream_only: number;
  fork_only: number;
}

/** Full-branch diff stats (all fetched commits). */
export interface FullDiffStats {
  upstreamTotal: number;
  forkTotal: number;
  forkAhead: number;
  forkBehind: number;
  lastSharedSha: string | null;
}
