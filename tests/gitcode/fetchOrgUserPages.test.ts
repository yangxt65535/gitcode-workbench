import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { fetchOrgUserIssuesPage } from "@/lib/gitcode/fetchOrgUserIssues";
import { fetchOrgUserPullsPage } from "@/lib/gitcode/fetchOrgUserPulls";

function jsonResponse(data: unknown, status = 200, headers?: Headers) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headers ?? new Headers(),
    text: async () => JSON.stringify(data),
  } as Response;
}

function issueRaw(number: number, repo = "repo-a") {
  return {
    number,
    title: `issue ${number}`,
    state: "open",
    labels: [],
    user: { login: "alice" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: `https://gitcode.com/org-a/${repo}/issues/${number}`,
    repository: { path: repo },
  };
}

function pullRaw(number: number, repo = "repo-a") {
  return {
    number,
    title: `pull ${number}`,
    state: "open",
    labels: [],
    author: { login: "alice" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: `https://gitcode.com/org-a/${repo}/pulls/${number}`,
    base: { ref: "main", repo: { path: repo } },
    head: { ref: "feature", repo: { path: repo } },
  };
}

function lastUrl(): URL {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const url = calls[calls.length - 1]?.[0];
  if (typeof url !== "string") throw new Error("no fetch call recorded");
  return new URL(url);
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchOrgUserIssuesPage", () => {
  it("requests creator stream with mapped params", async () => {
    await fetchOrgUserIssuesPage({
      token: "t",
      org: "org-a",
      username: "alice",
      involvement: "created",
      state: "open",
      sort: "updated",
      direction: "desc",
      page: 3,
      perPage: 100,
    });

    const url = lastUrl();
    expect(url.pathname).toBe("/api/v5/enterprises/org-a/issues");
    expect(url.searchParams.get("creator")).toBe("alice");
    expect(url.searchParams.has("assignee")).toBe(false);
    expect(url.searchParams.get("state")).toBe("open");
    expect(url.searchParams.get("sort")).toBe("updated_at");
    expect(url.searchParams.get("direction")).toBe("desc");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("per_page")).toBe("100");
  });

  it("requests assignee stream", async () => {
    await fetchOrgUserIssuesPage({
      token: "t",
      org: "org-a",
      username: "alice",
      involvement: "assigned",
      page: 1,
      perPage: 100,
    });

    const url = lastUrl();
    expect(url.searchParams.get("assignee")).toBe("alice");
    expect(url.searchParams.has("creator")).toBe(false);
    expect(url.searchParams.get("state")).toBe("all");
    expect(url.searchParams.get("sort")).toBe("updated_at");
  });

  it("maps raw items and reports counts", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse([issueRaw(1), issueRaw(2, "repo-b")]),
    );

    const page = await fetchOrgUserIssuesPage({
      token: "t",
      org: "org-a",
      username: "alice",
      involvement: "created",
      page: 1,
      perPage: 100,
    });

    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({
      org: "org-a",
      repo: "repo-a",
      number: 1,
    });
    expect(page.items[1]).toMatchObject({ repo: "repo-b", number: 2 });
    expect(page.rawCount).toBe(2);
    expect(page.perPage).toBe(100);
    expect(page.capped).toBe(false);
  });

  it("reports capped on the last allowed full page", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(Array.from({ length: 100 }, (_, i) => issueRaw(i + 1))),
    );

    const page = await fetchOrgUserIssuesPage({
      token: "t",
      org: "org-a",
      username: "alice",
      involvement: "created",
      page: 100, // MAX_ISSUES_PAGES
      perPage: 100,
    });

    expect(page.rawCount).toBe(100);
    expect(page.capped).toBe(true);
  });

  it("returns empty page for empty array", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse([]));

    const page = await fetchOrgUserIssuesPage({
      token: "t",
      org: "org-a",
      username: "alice",
      involvement: "created",
      page: 5,
      perPage: 100,
    });

    expect(page.items).toEqual([]);
    expect(page.rawCount).toBe(0);
    expect(page.capped).toBe(false);
  });

  it("throws GitCodeHttpError 401 on 401/403", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 403));

    await expect(
      fetchOrgUserIssuesPage({
        token: "t",
        org: "org-a",
        username: "alice",
        involvement: "created",
        page: 1,
        perPage: 100,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("throws 502 on non-array payload", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse({ message: "oops" }),
    );

    await expect(
      fetchOrgUserIssuesPage({
        token: "t",
        org: "org-a",
        username: "alice",
        involvement: "created",
        page: 1,
        perPage: 100,
      }),
    ).rejects.toBeInstanceOf(GitCodeHttpError);
  });
});

describe("fetchOrgUserPullsPage", () => {
  it("requests author param with mapped state", async () => {
    await fetchOrgUserPullsPage({
      token: "t",
      org: "org-a",
      username: "alice",
      state: "merged",
      sort: "created",
      direction: "asc",
      page: 2,
      perPage: 100,
    });

    const url = lastUrl();
    expect(url.pathname).toBe("/api/v5/enterprises/org-a/pull_requests");
    expect(url.searchParams.get("author")).toBe("alice");
    expect(url.searchParams.get("state")).toBe("merged");
    expect(url.searchParams.get("sort")).toBe("created");
    expect(url.searchParams.get("direction")).toBe("asc");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("per_page")).toBe("100");
  });

  it("maps raw items with repo from base", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse([pullRaw(11, "repo-x")]),
    );

    const page = await fetchOrgUserPullsPage({
      token: "t",
      org: "org-a",
      username: "alice",
      page: 1,
      perPage: 100,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      org: "org-a",
      repo: "repo-x",
      number: 11,
      user: { login: "alice" },
    });
    expect(page.rawCount).toBe(1);
    expect(page.capped).toBe(false);
  });

  it("reports capped on the last allowed full page", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(
      jsonResponse(Array.from({ length: 100 }, (_, i) => pullRaw(i + 1))),
    );

    const page = await fetchOrgUserPullsPage({
      token: "t",
      org: "org-a",
      username: "alice",
      page: 50, // MAX_PULL_PAGES_PER_REPO
      perPage: 100,
    });

    expect(page.capped).toBe(true);
  });

  it("throws GitCodeHttpError 401 on 401", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({}, 401));

    await expect(
      fetchOrgUserPullsPage({
        token: "t",
        org: "org-a",
        username: "alice",
        page: 1,
        perPage: 100,
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});
