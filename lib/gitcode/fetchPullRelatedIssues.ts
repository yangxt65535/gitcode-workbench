import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";

export type RelatedIssueLink = {
  number: number;
  title?: string;
  repo?: string;
};

type RawRelatedIssue = {
  number?: number | string;
  title?: string;
  repository?: { path?: string; name?: string; full_name?: string } | null;
};

function mapNumber(raw: number | string | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return n >= 1 ? n : null;
  }
  return null;
}

function resolveRepo(raw: RawRelatedIssue): string | undefined {
  const path = raw.repository?.path?.trim();
  if (path) return path;
  const name = raw.repository?.name?.trim();
  if (name) return name;
  const full = raw.repository?.full_name?.trim();
  if (full) {
    const parts = full.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1];
  }
  return undefined;
}

export async function fetchPullRelatedIssues(options: {
  token: string;
  org: string;
  repo: string;
  number: number | string;
  signal?: AbortSignal;
}): Promise<RelatedIssueLink[]> {
  const org = options.org.trim();
  const repo = options.repo.trim();
  const numberRaw = String(options.number).trim();

  if (!org || !repo || !/^\d+$/.test(numberRaw)) {
    throw new GitCodeHttpError(400, "org, repo and number are required");
  }

  const res = await fetchGitCode(
    `/repos/${org}/${repo}/pulls/${numberRaw}/issues`,
    { token: options.token, signal: options.signal },
  );

  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(401, "Token 无效或权限不足");
  }
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法加载关联 Issue");
  }

  const raw = await readGitCodeJson<
    RawRelatedIssue[] | { message?: string }
  >(res);
  if (!Array.isArray(raw)) return [];

  const out: RelatedIssueLink[] = [];
  for (const item of raw) {
    const number = mapNumber(item.number);
    if (number == null) continue;
    out.push({
      number,
      title: item.title?.trim() || undefined,
      repo: resolveRepo(item) || repo,
    });
  }
  return out;
}
