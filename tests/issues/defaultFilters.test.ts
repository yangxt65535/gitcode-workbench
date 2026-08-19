import { describe, expect, it } from "vitest";
import { DEFAULT_ISSUE_FILTERS } from "@/components/issues/IssueFilters";

describe("DEFAULT_ISSUE_FILTERS", () => {
  it("defaults to open state only", () => {
    expect(DEFAULT_ISSUE_FILTERS.state).toEqual(["open"]);
  });
});
