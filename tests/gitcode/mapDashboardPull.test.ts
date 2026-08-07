import { describe, expect, it } from "vitest";
import { mapDashboardPull } from "@/lib/gitcode/mapDashboardPull";

describe("mapDashboardPull", () => {
  it("maps base.repo.path and author", () => {
    const pull = mapDashboardPull(
      {
        number: 333,
        title: "chore: upgrade",
        state: "merged",
        author: { login: "yangxt65535" },
        labels: [{ name: "approved" }],
        created_at: "2026-08-07T11:40:17+08:00",
        updated_at: "2026-08-07T17:02:17+08:00",
        merged_at: "2026-08-07T17:02:15+08:00",
        html_url: "https://gitcode.com/openFuyao/bkeadm/merge_requests/333",
        base: {
          ref: "master",
          repo: {
            path: "bkeadm",
            namespace: { path: "openFuyao" },
          },
        },
      },
      "openFuyao",
    );
    expect(pull?.repo).toBe("bkeadm");
    expect(pull?.org).toBe("openFuyao");
    expect(pull?.number).toBe(333);
    expect(pull?.user.login).toBe("yangxt65535");
    expect(pull?.state).toBe("merged");
  });

  it("returns null without resolvable repo", () => {
    expect(
      mapDashboardPull({ number: 1, title: "x", state: "open" }, "o"),
    ).toBeNull();
  });
});
