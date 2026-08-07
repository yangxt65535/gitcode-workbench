import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  mapGitCodePullItem,
  type GitCodePullItemRaw,
} from "@/lib/gitcode/mapPullItem";
import type { DashboardPull } from "@/lib/dashboard/types";

export async function refreshPullMeta(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<Pick<DashboardPull, "state" | "labels" | "updated_at">> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const res = await fetchGitCode(`/repos/${org}/${repo}/pulls/${numberRaw}`, {
    token: options.token,
    signal: options.signal,
  });

  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) {
    throw new GitCodeHttpError(404, "PR 不存在或无权访问");
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法刷新 PR");
  }

  const raw = await readGitCodeJson<GitCodePullItemRaw>(res);
  const pull = mapGitCodePullItem(raw, org, repo);
  if (!pull) {
    throw new GitCodeHttpError(502, "GitCode 返回的 PR 数据无效");
  }

  return {
    state: pull.state,
    labels: pull.labels,
    updated_at: pull.updated_at,
  };
}
