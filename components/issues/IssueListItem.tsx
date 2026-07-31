"use client";

import type { Issue } from "@/lib/issues/types";
import styles from "./IssueListItem.module.css";

type IssueListItemProps = {
  issue: Issue;
  selected: boolean;
  onSelect: (number: number) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function IssueListItem({
  issue,
  selected,
  onSelect,
}: IssueListItemProps) {
  const labelSummary = issue.labels
    .slice(0, 3)
    .map((l) => l.name)
    .join(", ");

  return (
    <button
      type="button"
      role="listitem"
      className={`row ${selected ? "rowSelected" : ""} ${styles.item}`}
      onClick={() => onSelect(issue.number)}
    >
      <span
        className={`${styles.stateDot} ${
          issue.state === "open" ? styles.open : styles.closed
        }`}
        aria-hidden
      />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.number}>#{issue.number}</span>
          <span className={styles.title}>{issue.title}</span>
        </div>
        <div className={styles.meta}>
          <span>{issue.state}</span>
          {labelSummary ? <span>· {labelSummary}</span> : null}
          <span>· {formatTime(issue.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}
