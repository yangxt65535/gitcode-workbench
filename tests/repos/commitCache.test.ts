import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  clearCommitCache,
  commitCacheKey,
  fetchAllCommitsCached,
  getCommitCache,
  invalidateCommitCache,
  setCommitCache,
} from "@/lib/repos/commitCache";
import type { RepoCommit } from "@/lib/repos/types";

vi.mock("@/lib/gitcode/fetchRepoData", () => ({
  fetchAllCommits: vi.fn(),
}));

import { fetchAllCommits } from "@/lib/gitcode/fetchRepoData";

function commit(sha: string): RepoCommit {
  return {
    sha,
    short_sha: sha.slice(0, 8),
    message: sha,
    author_login: "u",
    author_date: "2026-01-01T00:00:00Z",
    html_url: "",
  };
}

describe("commitCache", () => {
  beforeEach(() => {
    clearCommitCache();
    vi.mocked(fetchAllCommits).mockReset();
  });

  it("builds stable cache keys", () => {
    expect(commitCacheKey(" OpenFuyao ", " Repo ", " main ")).toBe(
      commitCacheKey("openfuyao", "repo", "main"),
    );
  });

  it("returns complete cache without fetching", async () => {
    const key = commitCacheKey("o", "r", "main");
    setCommitCache(key, { commits: [commit("aaa")], complete: true });

    const onProgress = vi.fn();
    const result = await fetchAllCommitsCached({
      token: "t",
      org: "o",
      repo: "r",
      branch: "main",
      onProgress,
    });

    expect(result).toEqual([commit("aaa")]);
    expect(fetchAllCommits).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({
      commits: [commit("aaa")],
      complete: true,
    });
  });

  it("stores fetched commits in cache", async () => {
    vi.mocked(fetchAllCommits).mockImplementation(async ({ onProgress }) => {
      onProgress?.({ commits: [commit("bbb")], complete: true });
      return [commit("bbb")];
    });

    await fetchAllCommitsCached({
      token: "t",
      org: "o",
      repo: "r",
      branch: "dev",
    });

    expect(getCommitCache(commitCacheKey("o", "r", "dev"))).toEqual({
      commits: [commit("bbb")],
      complete: true,
    });
  });

  it("invalidates one branch so the next fetch hits the network", async () => {
    const key = commitCacheKey("o", "r", "main");
    setCommitCache(key, { commits: [commit("aaa")], complete: true });
    invalidateCommitCache(key);
    expect(getCommitCache(key)).toBeUndefined();

    vi.mocked(fetchAllCommits).mockImplementation(async ({ onProgress }) => {
      onProgress?.({ commits: [commit("bbb")], complete: true });
      return [commit("bbb")];
    });

    const result = await fetchAllCommitsCached({
      token: "t",
      org: "o",
      repo: "r",
      branch: "main",
    });

    expect(fetchAllCommits).toHaveBeenCalledTimes(1);
    expect(result).toEqual([commit("bbb")]);
  });

  it("does not drop sibling branch caches when invalidating one branch", () => {
    setCommitCache(commitCacheKey("o", "r", "main"), {
      commits: [commit("aaa")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "dev"), {
      commits: [commit("ccc")],
      complete: true,
    });

    invalidateCommitCache(commitCacheKey("o", "r", "main"));

    expect(getCommitCache(commitCacheKey("o", "r", "main"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("o", "r", "dev"))).toEqual({
      commits: [commit("ccc")],
      complete: true,
    });
  });

  it("clears all branch caches for workspace reset", () => {
    setCommitCache(commitCacheKey("o", "r", "main"), {
      commits: [commit("a")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "dev"), {
      commits: [commit("b")],
      complete: true,
    });

    clearCommitCache();

    expect(getCommitCache(commitCacheKey("o", "r", "main"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("o", "r", "dev"))).toBeUndefined();
  });

  it("keeps at most 3 branches per repo and evicts LRU", () => {
    setCommitCache(commitCacheKey("o", "r", "b1"), {
      commits: [commit("1")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "b2"), {
      commits: [commit("2")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "b3"), {
      commits: [commit("3")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "b4"), {
      commits: [commit("4")],
      complete: true,
    });

    expect(getCommitCache(commitCacheKey("o", "r", "b1"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("o", "r", "b2"))).toBeDefined();
    expect(getCommitCache(commitCacheKey("o", "r", "b3"))).toBeDefined();
    expect(getCommitCache(commitCacheKey("o", "r", "b4"))).toBeDefined();
  });

  it("evicts per repo independently for upstream and fork", () => {
    for (const branch of ["a", "b", "c", "d"]) {
      setCommitCache(commitCacheKey("upstream", "r", branch), {
        commits: [commit(`u-${branch}`)],
        complete: true,
      });
      setCommitCache(commitCacheKey("fork", "r", branch), {
        commits: [commit(`f-${branch}`)],
        complete: true,
      });
    }

    expect(getCommitCache(commitCacheKey("upstream", "r", "a"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("fork", "r", "a"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("upstream", "r", "d"))).toBeDefined();
    expect(getCommitCache(commitCacheKey("fork", "r", "d"))).toBeDefined();
  });

  it("refreshes LRU when re-reading a branch", () => {
    setCommitCache(commitCacheKey("o", "r", "old"), {
      commits: [commit("old")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "mid"), {
      commits: [commit("mid")],
      complete: true,
    });
    setCommitCache(commitCacheKey("o", "r", "new"), {
      commits: [commit("new")],
      complete: true,
    });

    getCommitCache(commitCacheKey("o", "r", "old"));

    setCommitCache(commitCacheKey("o", "r", "latest"), {
      commits: [commit("latest")],
      complete: true,
    });

    expect(getCommitCache(commitCacheKey("o", "r", "mid"))).toBeUndefined();
    expect(getCommitCache(commitCacheKey("o", "r", "old"))).toBeDefined();
    expect(getCommitCache(commitCacheKey("o", "r", "latest"))).toBeDefined();
  });
});
