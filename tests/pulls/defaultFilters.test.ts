import { describe, expect, it } from "vitest";
import { DEFAULT_PULL_FILTERS } from "@/components/pulls/PullFilters";

describe("DEFAULT_PULL_FILTERS", () => {
  it("defaults to open state only", () => {
    expect(DEFAULT_PULL_FILTERS.state).toEqual(["open"]);
  });
});
