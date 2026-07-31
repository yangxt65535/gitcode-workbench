import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "@/lib/gitcode/client";
import {
  mapGitCodeComment,
  type GitCodeCommentRaw,
} from "@/lib/gitcode/mapComment";
import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import {
  mapGitCodePull,
  type GitCodePullRaw,
} from "@/lib/gitcode/mapPull";
import { sortCommentsAsc } from "@/lib/issues/sortComments";
import type { Issue, IssueComment, RelatedPull } from "@/lib/issues/types";

export type IssueDetailPayload = {
  issue: Issue;
  comments: IssueComment[];
  related_pulls: RelatedPull[];
};

async function assertOk(res: Response, notFoundMsg: string): Promise<void> {
  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) {
    throw new GitCodeHttpError(404, notFoundMsg);
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法加载 Issue 详情");
  }
}

export async function fetchIssueDetail(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<IssueDetailPayload> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();
  const { token, signal } = options;

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const [issueRes, commentsRes, pullsRes] = await Promise.all([
    fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}`, { token, signal }),
    fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}/comments`, {
      token,
      signal,
      searchParams: { page: "1", per_page: "100" },
    }),
    fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}/pull_requests`, {
      token,
      signal,
    }),
  ]);

  await assertOk(issueRes, "Issue 不存在或无权访问");

  let comments: IssueComment[] = [];
  if (commentsRes.status !== 404) {
    await assertOk(commentsRes, "无法加载评论");
    const rawComments = await readGitCodeJson<
      GitCodeCommentRaw[] | { message?: string }
    >(commentsRes);
    if (Array.isArray(rawComments)) {
      comments = sortCommentsAsc(
        rawComments
          .map(mapGitCodeComment)
          .filter((c): c is IssueComment => c != null),
      );
    }
  }

  let related_pulls: RelatedPull[] = [];
  if (pullsRes.status !== 404) {
    await assertOk(pullsRes, "无法加载关联 PR");
    const rawPulls = await readGitCodeJson<
      GitCodePullRaw[] | { message?: string }
    >(pullsRes);
    if (Array.isArray(rawPulls)) {
      related_pulls = rawPulls
        .map((p) => mapGitCodePull(p, org, repo))
        .filter((p): p is RelatedPull => p != null);
    }
  }

  const raw = await readGitCodeJson<GitCodeIssueRaw>(issueRes);
  const issue = mapGitCodeIssue(raw);
  if (!issue) {
    throw new GitCodeHttpError(502, "GitCode 返回的 Issue 数据无效");
  }
  return { issue, comments, related_pulls };
}
