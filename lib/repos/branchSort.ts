const PRIORITY_BRANCHES = ["main", "master"] as const;

/** Put `main` / `master` first, then the rest alphabetically. */
export function sortBranchNames(names: string[]): string[] {
  const byLower = new Map(names.map((n) => [n.toLowerCase(), n]));
  const head: string[] = [];
  for (const key of PRIORITY_BRANCHES) {
    const found = byLower.get(key);
    if (found) head.push(found);
  }
  const headLower = new Set(head.map((n) => n.toLowerCase()));
  const rest = names
    .filter((n) => !headLower.has(n.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
  return [...head, ...rest];
}
