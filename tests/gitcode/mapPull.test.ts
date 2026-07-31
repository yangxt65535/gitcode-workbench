import { describe, expect, it } from "vitest";
import { mapGitCodePull } from "@/lib/gitcode/mapPull";
import { buildPullUrl } from "@/lib/issues/detailNav";

describe("buildPullUrl", () => {
  it("builds GitCode pulls page URL", () => {
    expect(buildPullUrl("openFuyao", "e2e-auto-test", 412)).toBe(
      "https://gitcode.com/openFuyao/e2e-auto-test/pulls/412",
    );
  });
});

describe("mapGitCodePull", () => {
  it("maps pull and keeps API html_url", () => {
    const p = mapGitCodePull(
      {
        number: 412,
        title: "fix installation",
        state: "merged",
        html_url:
          "https://gitcode.com/openFuyao/e2e-auto-test/merge_requests/412",
      },
      "openFuyao",
      "e2e-auto-test",
    );
    expect(p).toEqual({
      number: 412,
      title: "fix installation",
      state: "merged",
      html_url:
        "https://gitcode.com/openFuyao/e2e-auto-test/merge_requests/412",
    });
  });

  it("falls back to /pulls/{n} when html_url missing", () => {
    const p = mapGitCodePull(
      { number: "4", title: "readme", state: "opened" },
      "o",
      "r",
    );
    expect(p?.html_url).toBe("https://gitcode.com/o/r/pulls/4");
    expect(p?.number).toBe(4);
  });

  it("returns null without number", () => {
    expect(mapGitCodePull({ title: "x" })).toBeNull();
  });
});
