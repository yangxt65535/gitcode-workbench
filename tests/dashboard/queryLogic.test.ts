import { describe, expect, it } from "vitest";
import {
  filterDashboardItems,
  filterByItemKeys,
  sortDashboardItems,
  slicePage,
  collectLabels,
  DEFAULT_PANE_FILTERS,
} from "@/lib/dashboard/queryLogic";

const base = {
  org: "openFuyao",
  state: "open",
  labels: [{ name: "bug" }],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

const items = [
  {
    ...base,
    number: 1,
    title: "a",
    repo: "r1",
    html_url: "",
    user: { login: "u" },
  },
  {
    ...base,
    number: 2,
    title: "b",
    repo: "r2",
    state: "closed",
    labels: [{ name: "docs" }],
    updated_at: "2026-03-01T00:00:00Z",
    html_url: "",
    user: { login: "u" },
  },
];

describe("queryLogic", () => {
  it("filters by selected repos", () => {
    const out = filterDashboardItems(items, DEFAULT_PANE_FILTERS, ["r1"]);
    expect(out.map((i) => i.number)).toEqual([1]);
  });

  it("filters by state and label", () => {
    const out = filterDashboardItems(
      items,
      { ...DEFAULT_PANE_FILTERS, state: ["closed"], label: ["docs"] },
      "all",
    );
    expect(out.map((i) => i.number)).toEqual([2]);
  });

  it("sorts by updated desc and slices page", () => {
    const sorted = sortDashboardItems(items, "updated", "desc");
    expect(sorted[0].number).toBe(2);
    expect(slicePage(sorted, 1, 1).map((i) => i.number)).toEqual([2]);
  });

  it("collects unique labels", () => {
    expect(collectLabels(items)).toEqual(["bug", "docs"]);
  });

  it("filters by item keys", () => {
    const out = filterByItemKeys(items, new Set(["r2#2"]));
    expect(out.map((i) => i.number)).toEqual([2]);
    expect(filterByItemKeys(items, new Set())).toEqual([]);
  });
});
