import { describe, expect, it } from "vitest";
import { mapGitCodeComment } from "@/lib/gitcode/mapComment";

describe("mapGitCodeComment", () => {
  it("maps comment payload", () => {
    const c = mapGitCodeComment({
      id: 1,
      body: "hello",
      user: { login: "bot" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
    expect(c).toEqual({
      id: 1,
      body: "hello",
      user: { login: "bot" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    });
  });

  it("returns null without id", () => {
    expect(mapGitCodeComment({ body: "x" })).toBeNull();
  });
});
