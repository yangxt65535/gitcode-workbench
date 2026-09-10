import { describe, expect, it } from "vitest";
import { pullListMetaParts } from "@/lib/pulls/listItemMeta";
import { formatTime } from "@/lib/shared/formatTime";

describe("pullListMetaParts", () => {
  const pull = {
    user: { login: "carol" },
    state: "opened",
    labels: [{ name: "enhancement" }],
    head_ref: "feat/x",
    base_ref: "main",
    updated_at: "2026-01-11T08:00:00.000Z",
  };

  it("starts with creator and omits PR state", () => {
    const parts = pullListMetaParts(pull);
    expect(parts[0]).toBe("carol");
    expect(parts).not.toContain("opened");
    expect(parts).not.toContain("open");
    expect(parts).toContain("feat/x → main");
    expect(parts).toContain("enhancement");
    expect(parts).toContain(formatTime(pull.updated_at));
  });
});
