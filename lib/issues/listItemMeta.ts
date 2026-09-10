import { formatTime } from "@/lib/shared/formatTime";

export function issueListMetaParts(issue: {
  user: { login: string };
  labels: { name: string }[];
  updated_at: string;
}): string[] {
  const parts: string[] = [];
  const creator = issue.user.login.trim();
  if (creator) parts.push(creator);
  const labels = issue.labels
    .slice(0, 3)
    .map((l) => l.name)
    .filter(Boolean)
    .join(", ");
  if (labels) parts.push(labels);
  parts.push(formatTime(issue.updated_at));
  return parts;
}
