"use client";

import type { Issue } from "@/lib/issues/types";
import { formatTime } from "@/lib/shared/formatTime";
import styles from "./IssueListItem.module.css";

type IssueListItemProps = {
  issue: Issue;
  selected: boolean;
  onSelect: (number: number) => void;
};

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
