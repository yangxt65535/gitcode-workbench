import { itemKey } from "./itemKey";

export function relatedKeysFromLinks(
  links: { repo?: string; number: number }[],
  fallbackRepo: string,
): Set<string> {
  const set = new Set<string>();
  for (const link of links) {
    const repo = (link.repo?.trim() || fallbackRepo).trim();
    if (!repo || link.number < 1) continue;
    set.add(itemKey(repo, link.number));
  }
  return set;
}
