import { sortBranchNames } from "@/lib/repos/branchSort";
import type { RepoBranch, RepoCommit } from "@/lib/repos/types";
import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "./client";

export type GitCodeCommitRaw = {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: { login?: string; name?: string; date?: string };
  };
  author?: { login?: string };
};

export type GitCodeBranchRaw = {
  name?: string;
};

export type GitCodeRepoRaw = {
  default_branch?: string;
  full_name?: string;
  path?: string;
  namespace?: { path?: string };
  html_url?: string;
  web_url?: string;
  forked_from_project?: { full_name?: string };
  parent?: { full_name?: string };
  owner?: { login?: string };
};

function assertOk(res: Response, message: string): void {
  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) {
    throw new GitCodeHttpError(404, message);
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, message);
  }
}

export function mapGitCodeCommit(raw: GitCodeCommitRaw): RepoCommit | null {
  const sha = raw.sha?.trim();
  if (!sha) return null;
  const message =
    raw.commit?.message?.split("\n")[0]?.trim() || "(no message)";
  const author_login =
    raw.author?.login?.trim() ||
    raw.commit?.author?.login?.trim() ||
    raw.commit?.author?.name?.trim() ||
    "unknown";
  const author_date =
    raw.commit?.author?.date || new Date(0).toISOString();
  return {
    sha,
    short_sha: sha.slice(0, 8),
    message,
    author_login,
    author_date,
    html_url: raw.html_url || "",
  };
}

export function mapGitCodeBranch(raw: GitCodeBranchRaw): RepoBranch | null {
  const name = raw.name?.trim();
  return name ? { name } : null;
}

export async function fetchRepoDetail(options: {
  token: string;
  org: string;
  repo: string;
  signal?: AbortSignal;
}): Promise<{ default_branch: string; html_url: string }> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const res = await fetchGitCode(`/repos/${org}/${repo}`, {
    token: options.token,
    signal: options.signal,
  });
  assertOk(res, "仓库不存在或无权访问");
  const raw = await readGitCodeJson<GitCodeRepoRaw>(res);
  return {
    default_branch: raw.default_branch?.trim() || "main",
    html_url: raw.web_url || raw.html_url || `https://gitcode.com/${org}/${repo}`,
  };
}

export async function fetchBranches(options: {
  token: string;
  org: string;
  repo: string;
  signal?: AbortSignal;
}): Promise<RepoBranch[]> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const res = await fetchGitCode(`/repos/${org}/${repo}/branches`, {
    token: options.token,
    signal: options.signal,
    searchParams: { per_page: "100", page: "1" },
  });
  assertOk(res, "无法加载分支列表");
  const raw = await readGitCodeJson<GitCodeBranchRaw[] | { message?: string }>(
    res,
  );
  if (!Array.isArray(raw)) {
    throw new GitCodeHttpError(502, "GitCode 返回的分支数据无效");
  }
  const names = raw
    .map(mapGitCodeBranch)
    .filter((b): b is RepoBranch => b != null)
    .map((b) => b.name);
  return sortBranchNames(names).map((name) => ({ name }));
}

export async function fetchCommits(options: {
  token: string;
  org: string;
  repo: string;
  branch: string;
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}): Promise<RepoCommit[]> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const branch = options.branch.trim();
  if (!branch) return [];

  const res = await fetchGitCode(`/repos/${org}/${repo}/commits`, {
    token: options.token,
    signal: options.signal,
    searchParams: {
      sha: branch,
      per_page: String(options.perPage ?? 30),
      page: String(options.page ?? 1),
    },
  });
  assertOk(res, `无法加载分支 ${branch} 的 commit 记录`);
  const raw = await readGitCodeJson<GitCodeCommitRaw[] | { message?: string }>(
    res,
  );
  if (!Array.isArray(raw)) {
    throw new GitCodeHttpError(502, "GitCode 返回的 commit 数据无效");
  }
  return raw
    .map(mapGitCodeCommit)
    .filter((c): c is RepoCommit => c != null);
}

const MAX_COMMIT_PAGES = 50;
const COMMITS_FETCH_PER_PAGE = 100;

export async function fetchAllCommits(options: {
  token: string;
  org: string;
  repo: string;
  branch: string;
  signal?: AbortSignal;
}): Promise<RepoCommit[]> {
  const all: RepoCommit[] = [];
  for (let page = 1; page <= MAX_COMMIT_PAGES; page += 1) {
    const batch = await fetchCommits({
      ...options,
      page,
      perPage: COMMITS_FETCH_PER_PAGE,
    });
    all.push(...batch);
    if (batch.length < COMMITS_FETCH_PER_PAGE) break;
  }
  return all;
}

export function isForkOfUpstream(
  raw: GitCodeRepoRaw,
  upstreamOrg: string,
  upstreamRepo: string,
): boolean {
  const parent =
    raw.forked_from_project?.full_name?.trim() ||
    raw.parent?.full_name?.trim() ||
    "";
  if (!parent) return false;
  const expected = `${upstreamOrg.trim()}/${upstreamRepo.trim()}`.toLowerCase();
  return parent.toLowerCase() === expected;
}

export async function resolveForkRepo(options: {
  token: string;
  upstreamOrg: string;
  upstreamRepo: string;
  forkOwner: string;
  signal?: AbortSignal;
}): Promise<{
  org: string;
  repo: string;
  full_name: string;
  html_url: string;
  owner_login: string;
} | null> {
  const upstreamOrg = options.upstreamOrg.trim();
  const upstreamRepo = options.upstreamRepo.trim();
  const forkOwner = options.forkOwner.trim();
  if (!forkOwner) return null;

  const res = await fetchGitCode(
    `/repos/${forkOwner}/${upstreamRepo}`,
    { token: options.token, signal: options.signal },
  );
  if (res.status === 404) return null;
  assertOk(res, "无法访问 Fork 仓库");

  const raw = await readGitCodeJson<GitCodeRepoRaw>(res);
  if (!isForkOfUpstream(raw, upstreamOrg, upstreamRepo)) {
    return null;
  }

  const full_name = raw.full_name?.trim() || `${forkOwner}/${upstreamRepo}`;
  const [org, repoName] = full_name.split("/", 2);
  if (!org || !repoName) return null;

  return {
    org,
    repo: repoName,
    full_name,
    html_url:
      raw.web_url ||
      raw.html_url ||
      `https://gitcode.com/${org}/${repoName}`,
    owner_login: raw.owner?.login?.trim() || forkOwner,
  };
}

export async function findUserFork(options: {
  token: string;
  upstreamOrg: string;
  upstreamRepo: string;
  username: string;
  signal?: AbortSignal;
}): Promise<{
  org: string;
  repo: string;
  full_name: string;
  html_url: string;
  owner_login: string;
} | null> {
  return resolveForkRepo({
    token: options.token,
    upstreamOrg: options.upstreamOrg,
    upstreamRepo: options.upstreamRepo,
    forkOwner: options.username,
    signal: options.signal,
  });
}
