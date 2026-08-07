import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  mapGitCodePull,
  type GitCodePullRaw,
} from "@/lib/gitcode/mapPull";
import { resolveRelatedPullRepo } from "@/lib/dashboard/resolveRelatedPullRepo";

export type RelatedPullLink = {
  number: number;
  title: string;
  state: string;
  html_url: string;
  repo?: string;
};

type RelatedPullRaw = GitCodePullRaw & {
  base?: { repo?: { path?: string; full_name?: string } | null } | null;
  head?: { repo?: { path?: string; full_name?: string } | null } | null;
};

export async function fetchIssueRelatedPulls(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<RelatedPullLink[]> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const res = await fetchGitCode(
    `/repos/${org}/${repo}/issues/${numberRaw}/pull_requests`,
    { token: options.token, signal: options.signal },
  );

  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法加载关联 PR");
  }

  const raw = await readGitCodeJson<RelatedPullRaw[] | { message?: string }>(
    res,
  );
  if (!Array.isArray(raw)) return [];

  const out: RelatedPullLink[] = [];
  for (const p of raw) {
    const pullRepo = resolveRelatedPullRepo(p, repo);
    const mapped = mapGitCodePull(p, org, pullRepo);
    if (!mapped) continue;
    out.push({ ...mapped, repo: pullRepo });
  }
  return out;
}
