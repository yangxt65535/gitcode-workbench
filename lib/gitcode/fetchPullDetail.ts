import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "@/lib/gitcode/client";
import {
  mapGitCodeComment,
  type GitCodeCommentRaw,
} from "@/lib/gitcode/mapComment";
import {
  mapGitCodePullItem,
  type GitCodePullItemRaw,
} from "@/lib/gitcode/mapPullItem";
import { sortCommentsAsc } from "@/lib/issues/sortComments";
import type { Pull, PullComment } from "@/lib/pulls/types";

export type PullDetailPayload = {
  pull: Pull;
  comments: PullComment[];
};

async function assertOk(res: Response, notFoundMsg: string): Promise<void> {
  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) {
    throw new GitCodeHttpError(404, notFoundMsg);
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法加载 PR 详情");
  }
}

export async function fetchPullDetail(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<PullDetailPayload> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();
  const { token, signal } = options;

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const [pullRes, commentsRes] = await Promise.all([
    fetchGitCode(`/repos/${org}/${repo}/pulls/${numberRaw}`, { token, signal }),
    fetchGitCode(`/repos/${org}/${repo}/pulls/${numberRaw}/comments`, {
      token,
      signal,
      searchParams: {
        page: "1",
        per_page: "100",
        comment_type: "pr_comment",
      },
    }),
  ]);

  await assertOk(pullRes, "PR 不存在或无权访问");

  let comments: PullComment[] = [];
  if (commentsRes.status !== 404) {
    await assertOk(commentsRes, "无法加载评论");
    const rawComments = await readGitCodeJson<
      GitCodeCommentRaw[] | { message?: string }
    >(commentsRes);
    if (Array.isArray(rawComments)) {
      comments = sortCommentsAsc(
        rawComments
          .map(mapGitCodeComment)
          .filter((c): c is PullComment => c != null),
      );
    }
  }

  const raw = await readGitCodeJson<GitCodePullItemRaw>(pullRes);
  const pull = mapGitCodePullItem(raw, org, repo);
  if (!pull) {
    throw new GitCodeHttpError(502, "GitCode 返回的 PR 数据无效");
  }
  return { pull, comments };
}
