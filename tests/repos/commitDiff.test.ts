import { describe, expect, it } from "vitest";
import {
  classifyForkCommits,
  classifyUpstreamCommits,
  computeFullDiffStats,
  indexOfSha,
  isDiffStatsReady,
  pageForCommitIndex,
  shaSet,
  sliceCommitPage,
  totalPages,
} from "@/lib/repos/commitDiff";
import type { RepoCommit } from "@/lib/repos/types";

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

describe("commitDiff", () => {
  it("classifies shared and unique commits", () => {
    const upstream = [commit("aaa"), commit("bbb"), commit("ccc")];
    const fork = [commit("bbb"), commit("ddd")];
    const up = classifyUpstreamCommits(upstream, shaSet(fork));
    const fk = classifyForkCommits(fork, shaSet(upstream));
    expect(up.map((c) => c.kind)).toEqual([
      "upstream_only",
      "shared",
      "upstream_only",
    ]);
    expect(fk.map((c) => c.kind)).toEqual(["shared", "fork_only"]);
  });

  it("computes full diff stats", () => {
    const upstream = [commit("u1"), commit("u2"), commit("shared"), commit("old")];
    const fork = [commit("f1"), commit("shared"), commit("old2")];
    const stats = computeFullDiffStats(upstream, fork);
    expect(stats).toEqual({
      upstreamTotal: 4,
      forkTotal: 3,
      forkAhead: 1,
      forkBehind: 2,
      lastSharedSha: "shared",
    });
  });

  it("pages and slices commits", () => {
    const list = [commit("a"), commit("b"), commit("c"), commit("d")];
    expect(pageForCommitIndex(indexOfSha(list, "c"), 2)).toBe(2);
    expect(sliceCommitPage(list, 2, 2).map((c) => c.sha)).toEqual(["c", "d"]);
    expect(totalPages(4, 2)).toBe(2);
  });

  it("knows when diff stats are ready", () => {
    const upstream = [commit("u1"), commit("shared")];
    const fork = [commit("f1"), commit("shared")];
    expect(isDiffStatsReady(upstream, fork, false, false)).toBe(true);
    expect(
      isDiffStatsReady([commit("u1")], [commit("f1")], false, false),
    ).toBe(false);
    expect(
      isDiffStatsReady([commit("u1")], [commit("f1")], true, true),
    ).toBe(true);
  });
});
