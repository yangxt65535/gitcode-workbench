import {
  fetchAllCommits,
  type FetchCommitsProgress,
} from "@/lib/gitcode/fetchRepoData";
import type { RepoCommit } from "./types";

export type CommitCacheEntry = {
  commits: RepoCommit[];
  complete: boolean;
};

export const MAX_CACHED_BRANCHES_PER_REPO = 3;

const cache = new Map<string, CommitCacheEntry>();
/** org\0repo → branch cache keys, oldest first (LRU). */
const repoBranchOrder = new Map<string, string[]>();

export function commitCacheKey(
  org: string,
  repo: string,
  branch: string,
): string {
  return `${org.trim().toLowerCase()}\0${repo.trim().toLowerCase()}\0${branch.trim()}`;
}

export function commitRepoKey(org: string, repo: string): string {
  return `${org.trim().toLowerCase()}\0${repo.trim().toLowerCase()}`;
}

function repoKeyFromBranchKey(key: string): string {
  const sep = key.indexOf("\0");
  const second = key.indexOf("\0", sep + 1);
  return key.slice(0, second);
}

function touchBranch(key: string): void {
  const repoKey = repoKeyFromBranchKey(key);
  const order = (repoBranchOrder.get(repoKey) ?? []).filter((item) => item !== key);
  order.push(key);
  repoBranchOrder.set(repoKey, order);
}

function evictOverflowBranches(repoKey: string): void {
  const order = repoBranchOrder.get(repoKey) ?? [];
  while (order.length > MAX_CACHED_BRANCHES_PER_REPO) {
    const evictKey = order.shift();
    if (evictKey) cache.delete(evictKey);
  }
  repoBranchOrder.set(repoKey, order);
}

export function getCommitCache(key: string): CommitCacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  touchBranch(key);
  return { commits: [...entry.commits], complete: entry.complete };
}

export function setCommitCache(key: string, entry: CommitCacheEntry): void {
  cache.set(key, {
    commits: [...entry.commits],
    complete: entry.complete,
  });
  touchBranch(key);
  evictOverflowBranches(repoKeyFromBranchKey(key));
}

export function clearCommitCache(): void {
  cache.clear();
  repoBranchOrder.clear();
}

/** Returns cached commits when complete; otherwise fetches and updates cache incrementally. */
export async function fetchAllCommitsCached(options: {
  token: string;
  org: string;
  repo: string;
  branch: string;
  signal?: AbortSignal;
  onProgress?: (progress: FetchCommitsProgress) => void;
}): Promise<RepoCommit[]> {
  const key = commitCacheKey(options.org, options.repo, options.branch);
  const cached = cache.get(key);

  if (cached?.complete) {
    touchBranch(key);
    const commits = [...cached.commits];
    options.onProgress?.({ commits, complete: true });
    return commits;
  }

  if (cached) {
    touchBranch(key);
    options.onProgress?.({
      commits: [...cached.commits],
      complete: false,
    });
  }

  const all = await fetchAllCommits({
    ...options,
    onProgress: (progress) => {
      setCommitCache(key, progress);
      options.onProgress?.(progress);
    },
  });

  setCommitCache(key, { commits: all, complete: true });
  return all;
}
