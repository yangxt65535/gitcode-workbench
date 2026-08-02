import type { Pull, PullMeta, PullQuery } from "./types";

export function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

function normalizeState(state: string): string {
  const s = state.trim().toLowerCase();
  if (s === "opened" || s === "open") return "open";
  if (s === "closed" || s === "close") return "closed";
  return s;
}

export function matchesQuery(pull: Pull, query: PullQuery): boolean {
  if (activeFilter(query.state)) {
    const states = new Set(query.state.map(normalizeState));
    if (!states.has(normalizeState(pull.state))) return false;
  }
  if (
    activeFilter(query.creator) &&
    !query.creator.includes(pull.user.login)
  ) {
    return false;
  }
  if (activeFilter(query.base) && !query.base.includes(pull.base_ref)) {
    return false;
  }
  if (
    activeFilter(query.label) &&
    !pull.labels.some((l) => query.label!.includes(l.name))
  ) {
    return false;
  }
  if (activeFilter(query.milestone)) {
    const milestone = pull.milestone;
    const hit = query.milestone.some((m) => {
      if (m === "__none__") return milestone === null;
      return milestone === m;
    });
    if (!hit) return false;
  }
  const search = query.search?.trim().toLowerCase();
  if (search && !pull.title.toLowerCase().includes(search)) {
    return false;
  }
  return true;
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function buildMetaFromPulls(pulls: Pull[]): PullMeta {
  return {
    states: ["open", "closed", "merged"],
    creators: uniqueSorted(pulls.map((p) => p.user.login)),
    baseBranches: uniqueSorted(
      pulls.map((p) => p.base_ref).filter((b) => b !== ""),
    ),
    labels: uniqueSorted(pulls.flatMap((p) => p.labels.map((l) => l.name))),
    milestones: uniqueSorted(
      pulls
        .map((p) => p.milestone)
        .filter((m): m is string => m != null && m !== ""),
    ),
  };
}
