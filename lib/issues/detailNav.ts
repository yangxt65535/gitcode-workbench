export function indexInResults(
  numbers: number[],
  selected: number | null,
): number {
  if (selected == null) return -1;
  return numbers.indexOf(selected);
}

export function canNavigate(
  numbers: number[],
  selected: number | null,
): { prev: boolean; next: boolean } {
  const i = indexInResults(numbers, selected);
  if (i < 0) return { prev: false, next: false };
  return { prev: i > 0, next: i < numbers.length - 1 };
}

export function neighbor(
  numbers: number[],
  selected: number | null,
  dir: -1 | 1,
): number | null {
  const i = indexInResults(numbers, selected);
  if (i < 0) return null;
  return numbers[i + dir] ?? null;
}

export function buildIssueUrl(
  org: string,
  repo: string,
  number: number,
): string {
  return `https://gitcode.com/${org}/${repo}/issues/${number}`;
}

export function buildPullUrl(
  org: string,
  repo: string,
  number: number,
): string {
  return `https://gitcode.com/${org}/${repo}/pulls/${number}`;
}

export function parseJumpNumber(raw: string): number | null {
  const t = raw.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 ? n : null;
}
