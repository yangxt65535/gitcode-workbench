/**
 * Display page `displayPage` (1-based, `pageSize` rows per page) can only be
 * rendered from server pages `1..N` because items are sorted server-side.
 */
export function serverPageForDisplayPage(
  displayPage: number,
  pageSize: number,
  serverPerPage: number,
): number {
  return Math.max(1, Math.ceil((displayPage * pageSize) / serverPerPage));
}

/** Dedup-merge stream lists by `keyOf`; earlier lists win on conflicts. */
export function mergeDashboardItems<T>(
  lists: T[][],
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = keyOf(item);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(item);
      }
    }
  }
  return out;
}
