"use client";

import type { Issue } from "@/lib/issues/types";
import { IssueListItem } from "./IssueListItem";
import styles from "./IssueList.module.css";

type IssueListProps = {
  items: Issue[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
  loading?: boolean;
};

export function IssueList({
  items,
  selectedNumber,
  onSelect,
  loading,
}: IssueListProps) {
  if (loading) {
    return (
      <div className={styles.root} aria-busy="true" aria-label="加载中">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.emptyHint}>当前筛选条件下暂无 Issue</div>
    );
  }

  return (
    <div className={styles.root} role="list">
      {items.map((issue) => (
        <IssueListItem
          key={issue.number}
          issue={issue}
          selected={selectedNumber === issue.number}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
