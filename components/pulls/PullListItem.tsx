"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import type { Pull } from "@/lib/pulls/types";
import { pullListMetaParts } from "@/lib/pulls/listItemMeta";
import styles from "./PullListItem.module.css";

type PullListItemProps = {
  pull: Pull;
  selected: boolean;
  onSelect: (number: number) => void;
};

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
  const metaParts = pullListMetaParts(pull);
  const href = pull.html_url.trim();

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(pull.number);
    }
  }

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`row ${selected ? "rowSelected" : ""} ${styles.item}`}
      onClick={() => onSelect(pull.number)}
      onKeyDown={onKeyDown}
    >
      <span
        className={`${styles.stateDot} ${stateDotClass(pull.state)}`}
        aria-hidden
      />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.number}>#{pull.number}</span>
          {href ? (
            <a
              className={styles.title}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={stop}
            >
              {pull.title}
            </a>
          ) : (
            <span className={styles.title}>{pull.title}</span>
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
