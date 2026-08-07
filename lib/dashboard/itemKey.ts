export function itemKey(repo: string, number: number): string {
  return `${repo.trim()}#${number}`;
}

export function parseItemKey(
  key: string,
): { repo: string; number: number } | null {
  const i = key.lastIndexOf("#");
  if (i <= 0) return null;
  const repo = key.slice(0, i).trim();
  const n = Number(key.slice(i + 1));
  if (!repo || !Number.isInteger(n) || n < 1) return null;
  return { repo, number: n };
}
