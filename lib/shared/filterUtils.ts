export function activeFilter(values?: string[]): values is string[] {
  return Array.isArray(values) && values.length > 0;
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}
