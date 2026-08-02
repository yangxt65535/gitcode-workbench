import { describe, expect, it } from "vitest";
import { sortBranchNames } from "@/lib/repos/branchSort";

describe("sortBranchNames", () => {
  it("puts main and master first then sorts rest", () => {
    expect(sortBranchNames(["dev", "main", "feature", "master"])).toEqual([
      "main",
      "master",
      "dev",
      "feature",
    ]);
  });

  it("handles missing priority branches", () => {
    expect(sortBranchNames(["dev", "release"])).toEqual(["dev", "release"]);
  });
});
