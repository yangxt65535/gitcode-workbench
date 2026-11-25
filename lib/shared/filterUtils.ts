export function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

/** Move `preferred` to the front if it exists (case-insensitive); keep original spelling. */
export function preferFirst(
  options: string[],
  preferred?: string | null,
): string[] {
  const needle = preferred?.trim().toLowerCase();
  if (!needle) return options;
  const idx = options.findIndex((item) => item.toLowerCase() === needle);
  if (idx <= 0) return options;
  const next = options.slice();
  const [hit] = next.splice(idx, 1);
  next.unshift(hit);
  return next;
}
