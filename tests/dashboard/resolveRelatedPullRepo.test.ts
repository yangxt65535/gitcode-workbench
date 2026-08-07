import { describe, expect, it } from "vitest";
import { resolveRelatedPullRepo } from "@/lib/dashboard/resolveRelatedPullRepo";

describe("resolveRelatedPullRepo", () => {
  it("prefers base.repo.path over issue fallback", () => {
    expect(
      resolveRelatedPullRepo(
        {
          base: { repo: { path: "cluster-api-provider-bke" } },
          html_url:
            "https://gitcode.com/openFuyao/cluster-api-provider-bke/merge_requests/433",
        },
        "sig-installation",
      ),
    ).toBe("cluster-api-provider-bke");
  });

  it("parses html_url when base missing", () => {
    expect(
      resolveRelatedPullRepo(
        {
          html_url:
            "https://gitcode.com/openFuyao/openfuyao-powers/merge_requests/30",
        },
        "other",
      ),
    ).toBe("openfuyao-powers");
  });

  it("falls back to issue repo", () => {
    expect(resolveRelatedPullRepo({}, "sig-installation")).toBe(
      "sig-installation",
    );
  });
});
