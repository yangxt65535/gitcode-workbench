"use client";

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formatTime } from "@/lib/shared/formatTime";
import type { DashboardIssue } from "@/lib/dashboard/types";
import styles from "./DashboardListItem.module.css";

type DashboardListItemProps = {
  item: DashboardIssue;
  selected: boolean;
  onSelect: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  sortField: "created" | "updated";
};

export function DashboardListItem({
  item,
  selected,
  onSelect,
  onRefresh,
  refreshing,
  sortField,
}: DashboardListItemProps) {
  const labelSummary = item.labels
    .slice(0, 3)
    .map((l) => l.name)
    .join(", ");
  const time =
    sortField === "created" ? item.created_at : item.updated_at;

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  const rowClass = [
    "row",
    selected ? "rowSelected" : "",
    styles.item,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role="listitem"
      className={rowClass}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
    >
      <span
        className={`${styles.stateDot} ${
          item.state === "open" || item.state === "opened"
            ? styles.open
            : styles.closed
        }`}
        aria-hidden
      />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <span className={styles.number}>
            #{item.number} · {item.repo}
          </span>
          {item.html_url ? (
            <a
              className={styles.title}
              href={item.html_url}
              target="_blank"
              rel="noreferrer"
              onClick={stop}
            >
              {item.title}
            </a>
          ) : (
            <span className={styles.title}>{item.title}</span>
          )}
        </div>
        <div className={styles.meta}>
          <span>{item.state}</span>
          {labelSummary ? <span>· {labelSummary}</span> : null}
          <span>· {formatTime(time)}</span>
        </div>
      </div>
      {onRefresh ? (
        <Button
          type="button"
          variant="ghost"
          disabled={refreshing}
          onClick={(e) => {
            stop(e);
            onRefresh();
          }}
        >
          {refreshing ? "…" : "刷新"}
        </Button>
      ) : null}
    </div>
  );
}
