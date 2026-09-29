import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { GitCodeIssueRepository } from "@/lib/issues/gitcodeIssueRepository";
import { LIST_MAX_PAGES } from "@/lib/issues/types";

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    text: async () => JSON.stringify(data),
  } as Response;
}

function issueRaw(number: number, title = `issue ${number}`) {
  return {
    number,
    title,
    state: "open",
    labels: [],
    user: { login: "alice" },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    html_url: `https://gitcode.com/org-a/repo-a/issues/${number}`,
  };
}

const QUERY = {
  org: "org-a",
  repo: "repo-a",
  state: ["open"],
  creator: ["bob"],
  assignee: [] as string[],
  label: ["bug", "perf"],
  milestone: [] as string[],
  search: undefined as string | undefined,
  sort: "updated" as const,
  direction: "desc" as const,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([])));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitCodeIssueRepository.fetchPage", () => {
  it("sends mapped list search params", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse([issueRaw(1)]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const repo = new GitCodeIssueRepository("t");
    await repo.fetchPage({ ...QUERY, search: "  crash  " }, 3, 20);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/v5/repos/org-a/repo-a/issues");
    expect(url.searchParams.get("state")).toBe("open");
    expect(url.searchParams.get("sort")).toBe("updated");
    expect(url.searchParams.get("direction")).toBe("desc");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("per_page")).toBe("20");
    expect(url.searchParams.get("labels")).toBe("bug,perf");
    expect(url.searchParams.get("creator")).toBe("bob");
    expect(url.searchParams.get("assignee")).toBeNull();
    expect(url.searchParams.get("search")).toBe("crash");
  });

  it("maps open+closed to state=all", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      jsonResponse([]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const repo = new GitCodeIssueRepository("t");
    await repo.fetchPage({ ...QUERY, state: ["open", "closed"] }, 1, 20);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.get("state")).toBe("all");
  });

  it("returns mapped items and server rawCount, then filters client-side", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse([issueRaw(1, "fix crash on boot"), issueRaw(2, "unrelated")]),
      ),
    );

    const repo = new GitCodeIssueRepository("t");
    const page = await repo.fetchPage(
      { ...QUERY, label: [], creator: [], search: "crash" },
      1,
      20,
    );

    expect(page.rawCount).toBe(2);
    expect(page.items.map((i) => i.number)).toEqual([1]);
    expect(page.capped).toBe(false);
  });

  it("skips the request when org or repo is blank", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const repo = new GitCodeIssueRepository("t");
    const page = await repo.fetchPage({ ...QUERY, org: "  " }, 1, 20);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(page).toEqual({ items: [], rawCount: 0, perPage: 20, capped: false });
  });

  it("marks capped on the last allowed full page", async () => {
    const full = Array.from({ length: 20 }, (_, i) => issueRaw(i + 1));
    const fetchMock = vi.fn(async () => jsonResponse(full));
    vi.stubGlobal("fetch", fetchMock);

    const repo = new GitCodeIssueRepository("t");
    const page = await repo.fetchPage(QUERY, LIST_MAX_PAGES, 20);

    expect(page.capped).toBe(true);
  });

  it("throws GitCodeHttpError 401 on 401", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 401)));

    const repo = new GitCodeIssueRepository("t");
    await expect(repo.fetchPage(QUERY, 1, 20)).rejects.toMatchObject({
      status: 401,
    });
  });
});
