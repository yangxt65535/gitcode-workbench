import type { RelatedPull } from "@/lib/issues/types";
import { buildPullUrl } from "@/lib/issues/detailNav";

export type GitCodePullRaw = {
  number?: number | string;
  title?: string;
  state?: string;
  html_url?: string | null;
  url?: string | null;
};

function mapNumber(raw: number | string | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.trunc(raw);
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return n >= 1 ? n : null;
  }
  return null;
}

export function mapGitCodePull(
  raw: GitCodePullRaw,
  org?: string,
  repo?: string,
): RelatedPull | null {
  const number = mapNumber(raw.number);
  if (number == null) return null;

  const apiUrl =
    (typeof raw.html_url === "string" && raw.html_url.trim()) ||
    (typeof raw.url === "string" && raw.url.trim()) ||
    "";
  const html_url =
    apiUrl || (org && repo ? buildPullUrl(org, repo, number) : "");

  return {
    number,
    title: raw.title?.trim() || `PR #${number}`,
    state: (raw.state ?? "").trim() || "unknown",
    html_url,
  };
}
