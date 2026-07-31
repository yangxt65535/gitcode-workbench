import type { IssueComment } from "@/lib/issues/types";

/** Oldest first; stable for equal timestamps by id string. */
export function sortCommentsAsc(comments: IssueComment[]): IssueComment[] {
  return [...comments].sort((a, b) => {
    const ta = Date.parse(a.created_at);
    const tb = Date.parse(b.created_at);
    const aOk = Number.isFinite(ta);
    const bOk = Number.isFinite(tb);
    if (aOk && bOk && ta !== tb) return ta - tb;
    if (aOk !== bOk) return aOk ? -1 : 1;
    return String(a.id).localeCompare(String(b.id));
  });
}
