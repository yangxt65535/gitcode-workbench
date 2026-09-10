"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import type { Issue } from "@/lib/issues/types";
import { issueListMetaParts } from "@/lib/issues/listItemMeta";
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
  const metaParts = issueListMetaParts(issue);
  const href = issue.html_url.trim();

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(issue.number);
    }
  }

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`row ${selected ? "rowSelected" : ""} ${styles.item}`}
      onClick={() => onSelect(issue.number)}
      onKeyDown={onKeyDown}
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
          {href ? (
            <a
              className={styles.title}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={stop}
            >
              {issue.title}
            </a>
          ) : (
            <span className={styles.title}>{issue.title}</span>
          )}
        </div>
        <div className={styles.meta}>
          {metaParts.map((part, i) => (
            <span key={`${part}-${i}`}>
              {i > 0 ? " · " : null}
              {part}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
