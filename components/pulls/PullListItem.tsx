"use client";

import type { Pull } from "@/lib/pulls/types";
import styles from "./PullListItem.module.css";

type PullListItemProps = {
  pull: Pull;
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

function stateDotClass(state: string): string {
  const s = state.toLowerCase();
  if (s === "open" || s === "opened") return styles.open;
  if (s === "merged") return styles.merged;
  return styles.closed;
}

export function PullListItem({
  pull,
  selected,
  onSelect,
}: PullListItemProps) {
  const labelSummary = pull.labels
    .slice(0, 3)
    .map((l) => l.name)
    .join(", ");
  const branchSummary =
    pull.head_ref && pull.base_ref
      ? `${pull.head_ref} → ${pull.base_ref}`
      : pull.base_ref || pull.head_ref || "";

  return (
    <button
      type="button"
      role="listitem"
      className={`row ${selected ? "rowSelected" : ""} ${styles.item}`}
      onClick={() => onSelect(pull.number)}
    >
      <span
        className={`${styles.stateDot} ${stateDotClass(pull.state)}`}
        aria-hidden
      />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.number}>#{pull.number}</span>
          <span className={styles.title}>{pull.title}</span>
        </div>
        <div className={styles.meta}>
          <span>{pull.state}</span>
          {branchSummary ? <span>· {branchSummary}</span> : null}
          {labelSummary ? <span>· {labelSummary}</span> : null}
          <span>· {formatTime(pull.updated_at)}</span>
        </div>
      </div>
    </button>
  );
}
