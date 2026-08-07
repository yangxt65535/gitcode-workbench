import {
  fetchGitCode,
  GitCodeHttpError,
  readGitCodeJson,
} from "@/lib/gitcode/client";
import { MAX_ORG_REPOS } from "@/lib/dashboard/types";

export type OrgRepo = {
  name: string;
  path: string;
};

type RawRepo = {
  name?: string;
  path?: string;
  full_name?: string;
};

function mapRepo(raw: RawRepo): OrgRepo | null {
  const path =
    raw.path?.trim() ||
    raw.name?.trim() ||
    raw.full_name?.split("/").pop()?.trim() ||
    "";
  if (!path) return null;
  const name = raw.name?.trim() || path;
  return { name, path };
}

export async function fetchOrgRepos(options: {
  token: string;
  org: string;
  signal?: AbortSignal;
}): Promise<OrgRepo[]> {
  const org = options.org.trim();
  if (!org) {
    throw new GitCodeHttpError(400, "org is required");
  }

  const out: OrgRepo[] = [];
  let page = 1;

  while (out.length < MAX_ORG_REPOS) {
    const res = await fetchGitCode(`/orgs/${org}/repos`, {
      token: options.token,
      signal: options.signal,
      searchParams: {
        page: String(page),
        per_page: "100",
      },
    });

    if (res.status === 401 || res.status === 403) {
      throw new GitCodeHttpError(401, "Token 无效或权限不足");
    }
    if (!res.ok) {
      throw new GitCodeHttpError(res.status, "无法加载组织仓库列表");
    }

    const raw = await readGitCodeJson<RawRepo[] | { message?: string }>(res);
    if (!Array.isArray(raw) || raw.length === 0) break;

    for (const item of raw) {
      const mapped = mapRepo(item);
      if (mapped) out.push(mapped);
      if (out.length >= MAX_ORG_REPOS) break;
    }

    if (raw.length < 100) break;
    page += 1;
  }

  return out;
}
