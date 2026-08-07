/**
 * Resolve the target repo of an Issue-linked PR.
 * Related PRs may live in a different repo than the Issue.
 */
export function resolveRelatedPullRepo(
  raw: {
    html_url?: string | null;
    url?: string | null;
    base?: { repo?: { path?: string; full_name?: string } | null } | null;
    head?: { repo?: { path?: string; full_name?: string } | null } | null;
  },
  fallbackRepo: string,
): string {
  const basePath = raw.base?.repo?.path?.trim();
  if (basePath) return basePath;

  const headPath = raw.head?.repo?.path?.trim();
  if (headPath) return headPath;

  const full =
    raw.base?.repo?.full_name?.trim() || raw.head?.repo?.full_name?.trim();
  if (full) {
    const parts = full.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1]!;
  }

  const link = (raw.html_url || raw.url || "").trim();
  // https://gitcode.com/{org}/{repo}/merge_requests/{n}
  // https://gitcode.com/{org}/{repo}/pulls/{n}
  const m = link.match(
    /gitcode\.com\/[^/]+\/([^/]+)\/(?:merge_requests|pulls)\//i,
  );
  if (m?.[1]) return m[1];

  return fallbackRepo.trim();
}
