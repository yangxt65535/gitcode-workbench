import { describe, expect, it } from "vitest";
import { sortCommentsAsc } from "@/lib/issues/sortComments";
import type { IssueComment } from "@/lib/issues/types";

function c(
  id: number,
  created_at: string,
): IssueComment {
  return {
    id,
    body: String(id),
    user: { login: "u" },
    created_at,
    updated_at: created_at,
  };
}

describe("sortCommentsAsc", () => {
  it("orders by created_at ascending", () => {
    const sorted = sortCommentsAsc([
      c(3, "2026-01-03T00:00:00Z"),
      c(1, "2026-01-01T00:00:00Z"),
      c(2, "2026-01-02T00:00:00Z"),
    ]);
    expect(sorted.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("does not mutate input", () => {
    const input = [c(2, "2026-01-02T00:00:00Z"), c(1, "2026-01-01T00:00:00Z")];
    const copy = [...input];
    sortCommentsAsc(input);
    expect(input).toEqual(copy);
  });
});
