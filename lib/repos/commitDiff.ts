import type {
  ClassifiedCommit,
  CommitDiffSummary,
  FullDiffStats,
  RepoCommit,
} from "./types";

export function classifyUpstreamCommits(
  upstream: RepoCommit[],
  forkShas: Set<string>,
): ClassifiedCommit[] {
  return upstream.map((commit) => ({
    commit,
    kind: forkShas.has(commit.sha) ? "shared" : "upstream_only",
  }));
}

export function classifyForkCommits(
  fork: RepoCommit[],
  upstreamShas: Set<string>,
): ClassifiedCommit[] {
  return fork.map((commit) => ({
    commit,
    kind: upstreamShas.has(commit.sha) ? "shared" : "fork_only",
  }));
}

export function summarizeDiff(
  upstream: ClassifiedCommit[],
  fork: ClassifiedCommit[],
): CommitDiffSummary {
  return {
    shared: upstream.filter((c) => c.kind === "shared").length,
    upstream_only: upstream.filter((c) => c.kind === "upstream_only").length,
    fork_only: fork.filter((c) => c.kind === "fork_only").length,
  };
}

export function shaSet(commits: RepoCommit[]): Set<string> {
  return new Set(commits.map((c) => c.sha));
}

export function indexOfSha(commits: RepoCommit[], sha: string): number {
  return commits.findIndex((c) => c.sha === sha);
}

export function pageForCommitIndex(
  index: number,
  perPage: number,
): number {
  if (index < 0) return 1;
  return Math.floor(index / perPage) + 1;
}

export function sliceCommitPage(
  commits: RepoCommit[],
  page: number,
  perPage: number,
): RepoCommit[] {
  const start = (page - 1) * perPage;
  return commits.slice(start, start + perPage);
}

export function totalPages(count: number, perPage: number): number {
  if (count <= 0) return 1;
  return Math.max(1, Math.ceil(count / perPage));
}

/** Newest-first lists: first shared commit on upstream is the latest common ancestor. */
export function computeFullDiffStats(
  upstream: RepoCommit[],
  fork: RepoCommit[],
): FullDiffStats {
  const forkSet = shaSet(fork);
  let lastSharedSha: string | null = null;
  let upstreamIdx = -1;
  let forkIdx = -1;

  for (let i = 0; i < upstream.length; i += 1) {
    if (forkSet.has(upstream[i].sha)) {
      lastSharedSha = upstream[i].sha;
      upstreamIdx = i;
      forkIdx = indexOfSha(fork, lastSharedSha);
      break;
    }
  }

  return {
    upstreamTotal: upstream.length,
    forkTotal: fork.length,
    forkAhead: forkIdx > 0 ? forkIdx : 0,
    forkBehind: upstreamIdx > 0 ? upstreamIdx : 0,
    lastSharedSha,
  };
}

/** @deprecated use computeFullDiffStats().lastSharedSha */
export function findLastSharedSha(
  upstream: ClassifiedCommit[],
): string | null {
  for (const item of upstream) {
    if (item.kind === "shared") return item.commit.sha;
  }
  return null;
}
