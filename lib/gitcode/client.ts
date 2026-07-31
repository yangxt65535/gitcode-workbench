const GITCODE_API_BASE = "https://api.gitcode.com/api/v5";

export class GitCodeHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitCodeHttpError";
    this.status = status;
  }
}

export type GitCodeFetchOptions = {
  token: string;
  searchParams?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

export async function fetchGitCode(
  path: string,
  options: GitCodeFetchOptions,
): Promise<Response> {
  const url = new URL(
    path.startsWith("http") ? path : `${GITCODE_API_BASE}${path}`,
  );
  if (options.searchParams) {
    for (const [key, value] of Object.entries(options.searchParams)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    cache: "no-store",
    signal: options.signal,
  });
  return res;
}

export async function readGitCodeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new GitCodeHttpError(502, "GitCode 返回空响应");
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GitCodeHttpError(502, "GitCode 返回的数据不是合法 JSON");
  }
}

export type GitCodeUser = {
  login: string;
  name?: string;
  avatar_url?: string;
};

export async function fetchGitCodeUser(token: string): Promise<GitCodeUser> {
  const res = await fetchGitCode("/user", { token });
  if (res.status === 401 || res.status === 403) {
    throw new GitCodeHttpError(res.status, "Token 无效或权限不足");
  }
  if (!res.ok) {
    throw new GitCodeHttpError(res.status, "无法连接 GitCode，请稍后重试");
  }
  const data = await readGitCodeJson<{
    login?: string;
    name?: string;
    avatar_url?: string;
  }>(res);
  if (!data.login) {
    throw new GitCodeHttpError(502, "GitCode 返回的用户信息无效");
  }
  return {
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url,
  };
}
