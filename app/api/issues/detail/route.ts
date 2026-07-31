import { NextRequest, NextResponse } from "next/server";
import { fetchGitCode, GitCodeHttpError, readGitCodeJson } from "@/lib/gitcode/client";
import {
  mapGitCodeIssue,
  type GitCodeIssueRaw,
} from "@/lib/gitcode/mapIssue";
import {
  mapGitCodeComment,
  type GitCodeCommentRaw,
} from "@/lib/gitcode/mapComment";
import {
  mapGitCodePull,
  type GitCodePullRaw,
} from "@/lib/gitcode/mapPull";
import { extractBearer } from "@/lib/issues/authHeader";
import { sortCommentsAsc } from "@/lib/issues/sortComments";
import type { IssueComment, RelatedPull } from "@/lib/issues/types";

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

export async function GET(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ message: "token required" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const org = sp.get("org")?.trim() ?? "";
  const repo = sp.get("repo")?.trim() ?? "";
  const numberRaw = sp.get("number")?.trim() ?? "";
  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    return NextResponse.json(
      { message: "org, repo and number are required" },
      { status: 400 },
    );
  }

  try {
    const [issueRes, commentsRes, pullsRes] = await Promise.all([
      fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}`, { token }),
      fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}/comments`, {
        token,
        searchParams: { page: "1", per_page: "100" },
      }),
      fetchGitCode(`/repos/${org}/${repo}/issues/${numberRaw}/pull_requests`, {
        token,
      }),
    ]);

    await assertOk(issueRes, "Issue 不存在或无权访问");
    // Comments / related PRs 404 → treat as empty list
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
    return NextResponse.json({ issue, comments, related_pulls });
  } catch (err) {
    if (err instanceof GitCodeHttpError) {
      const status =
        err.status === 404 ? 404 : err.status === 401 || err.status === 403 ? 401 : 502;
      return NextResponse.json({ message: err.message }, { status });
    }
    return NextResponse.json(
      { message: "无法加载 Issue 详情" },
      { status: 502 },
    );
  }
}
