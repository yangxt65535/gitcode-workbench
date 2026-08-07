import type { DashboardIssue } from "./types";

export function mergeDashboardMeta<T extends DashboardIssue>(
  item: T,
  patch: Partial<Pick<DashboardIssue, "state" | "labels" | "updated_at">>,
): T {
  return {
    ...item,
    ...(patch.state != null ? { state: patch.state } : {}),
    ...(patch.labels != null ? { labels: patch.labels } : {}),
    ...(patch.updated_at != null ? { updated_at: patch.updated_at } : {}),
  };
}
