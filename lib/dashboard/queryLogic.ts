import type { DashboardPaneFilters } from "./types";
export { DEFAULT_PANE_FILTERS, DEFAULT_ISSUE_PANE_FILTERS } from "./types";

type Labeled = {
  state: string;
  labels: { name: string }[];
  repo: string;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
};

function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

function matchesState(item: Labeled, states: string[]): boolean {
  const normalized = item.state.trim().toLowerCase();
  const isMerged =
    normalized === "merged" ||
    (typeof item.merged_at === "string" && item.merged_at.trim() !== "");

  return states.some((raw) => {
    const s = raw.trim().toLowerCase();
    if (s === "merged") return isMerged;
    if (s === "closed") return normalized === "closed" && !isMerged;
    if (s === "open") return normalized === "open" || normalized === "opened";
    return normalized === s;
  });
}

export function filterDashboardItems<T extends Labeled>(
  items: T[],
  filters: DashboardPaneFilters,
  selectedRepos: string[] | "all",
): T[] {
  return items.filter((item) => {
    if (selectedRepos !== "all" && selectedRepos.length > 0) {
      if (!selectedRepos.includes(item.repo)) return false;
    }
    if (activeFilter(filters.state) && !matchesState(item, filters.state)) {
      return false;
    }
    if (
      activeFilter(filters.label) &&
      !item.labels.some((l) => filters.label.includes(l.name))
    ) {
      return false;
    }
    return true;
  });
}

export function sortDashboardItems<T extends Labeled>(
  items: T[],
  sort: DashboardPaneFilters["sort"] = "updated",
  direction: DashboardPaneFilters["direction"] = "desc",
): T[] {
  const field = sort === "updated" ? "updated_at" : "created_at";
  const mul = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const diff = Date.parse(a[field]) - Date.parse(b[field]);
    return diff * mul;
  });
}

export function slicePage<T>(items: T[], page: number, perPage: number): T[] {
  const p = Math.max(1, page);
  const size = Math.max(1, perPage);
  const start = (p - 1) * size;
  return items.slice(start, start + size);
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function collectLabels(items: { labels: { name: string }[] }[]): string[] {
  return uniqueSorted(items.flatMap((i) => i.labels.map((l) => l.name)));
}

export function filterByItemKeys<
  T extends { repo: string; number: number },
>(items: T[], keys: Set<string>): T[] {
  if (keys.size === 0) return [];
  return items.filter((item) => keys.has(`${item.repo.trim()}#${item.number}`));
}
