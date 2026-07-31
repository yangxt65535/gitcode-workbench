import type { IssueComment, IssueUser } from "@/lib/issues/types";

export type GitCodeCommentRaw = {
  id?: number | string;
  body?: string | null;
  user?: { login?: string } | null;
  created_at?: string;
  updated_at?: string;
};

export function mapGitCodeComment(raw: GitCodeCommentRaw): IssueComment | null {
  if (raw.id == null) return null;
  const login = raw.user?.login?.trim();
  const user: IssueUser = { login: login || "unknown" };
  return {
    id: raw.id,
    body: typeof raw.body === "string" ? raw.body : "",
    user,
    created_at: raw.created_at || new Date(0).toISOString(),
    updated_at: raw.updated_at || raw.created_at || new Date(0).toISOString(),
  };
}
