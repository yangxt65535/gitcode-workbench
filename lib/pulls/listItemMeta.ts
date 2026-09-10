import { formatTime } from "@/lib/shared/formatTime";

export function pullBranchSummary(pull: {
  head_ref: string;
  base_ref: string;
}): string {
  if (pull.head_ref && pull.base_ref) {
    return `${pull.head_ref} → ${pull.base_ref}`;
  }
  return pull.base_ref || pull.head_ref || "";
}

export function pullListMetaParts(pull: {
  user: { login: string };
  labels: { name: string }[];
  head_ref: string;
  base_ref: string;
  updated_at: string;
}): string[] {
  const parts: string[] = [];
  const creator = pull.user.login.trim();
  if (creator) parts.push(creator);
  const branch = pullBranchSummary(pull);
  if (branch) parts.push(branch);
  const labels = pull.labels
    .slice(0, 3)
    .map((l) => l.name)
    .filter(Boolean)
    .join(", ");
  if (labels) parts.push(labels);
  parts.push(formatTime(pull.updated_at));
  return parts;
}
