import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import type { DashboardIssue } from "@/lib/dashboard/types";

export async function refreshIssueMeta(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<Pick<DashboardIssue, "state" | "labels" | "updated_at">> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const res = await fetchGitCode(
    `/repos/${org}/${repo}/issues/${numberRaw}`,
    {
      token: options.token,
      signal: options.signal,
    },
  );

  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) {
    throw new GitCodeHttpError(404, "Issue 不存在或无权访问");
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法刷新 Issue");
  }

  const raw = await readGitCodeJson<GitCodeIssueRaw>(res);
  const issue = mapGitCodeIssue(raw);
  if (!issue) {
    throw new GitCodeHttpError(502, "GitCode 返回的 Issue 数据无效");
  }

  return {
    state: issue.state,
    labels: issue.labels,
    updated_at: issue.updated_at,
  };
}
