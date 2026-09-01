"use client";

import { Button } from "@/components/ui/Button";
import { DashboardListItem } from "./DashboardListItem";
import { PaneFilters } from "./PaneFilters";
import { itemKey } from "@/lib/dashboard/itemKey";
import type {
  DashboardIssue,
  DashboardPaneFilters,
  DashboardSelection,
} from "@/lib/dashboard/types";
import styles from "./Pane.module.css";

type DashboardPaneProps<T extends DashboardIssue> = {
  side: "issue" | "pull";
  title: string;
  filters: DashboardPaneFilters;
  labelOptions: string[];
  onFiltersChange: (next: DashboardPaneFilters) => void;
  items: T[];
  loading: boolean;
  page: number;
  totalPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  selection: DashboardSelection | null;
  onSelect: (item: T) => void;
  onRefresh?: (item: T) => void;
  refreshingKey?: string | null;
  emptyHint: string;
  headerHint?: string | null;
  disabled?: boolean;
  onReload?: () => void;
};

export function DashboardPane<T extends DashboardIssue>({
  side,
  title,
  filters,
  labelOptions,
  onFiltersChange,
  items,
  loading,
  page,
  totalPage,
  totalCount,
  onPageChange,
  selection,
  onSelect,
  onRefresh,
  refreshingKey = null,
  emptyHint,
  headerHint,
  disabled,
  onReload,
}: DashboardPaneProps<T>) {
  return (
    <section
      className={styles.pane}
      aria-label={side === "issue" ? "Issues" : "Pull Requests"}
    >
      <header className={styles.header}>
        <div className={styles.headerMain}>
          {title}
          {headerHint ? (
            <span className={styles.headerHint}>{headerHint}</span>
          ) : null}
        </div>
        {onReload ? (
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || loading}
            onClick={onReload}
          >
            刷新
          </Button>
        ) : null}
      </header>
      <PaneFilters
        side={side}
        value={filters}
        labelOptions={labelOptions}
        onChange={onFiltersChange}
        disabled={disabled || loading}
      />
      <div className={styles.list} role="list">
        {loading ? (
          <div className={styles.hint} aria-busy="true">
            加载中…
          </div>
        ) : items.length === 0 ? (
          <div className={styles.hint}>{emptyHint}</div>
        ) : (
          items.map((item) => {
            const key = itemKey(item.repo, item.number);
            const selected =
              selection?.side === side &&
              selection.repo === item.repo &&
              selection.number === item.number;
            return (
              <DashboardListItem
                key={key}
                item={item}
                selected={selected}
                onSelect={() => onSelect(item)}
                onRefresh={onRefresh ? () => onRefresh(item) : undefined}
                refreshing={refreshingKey === key}
                sortField={filters.sort}
              />
            );
          })
        )}
      </div>
      <footer className={styles.footer}>
        <Button
          type="button"
          variant="secondary"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </Button>
        <span className={styles.pageInfo}>
          第 {page} / {Math.max(totalPage, 1)} 页 · 共 {totalCount}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={page >= totalPage || loading || totalCount === 0}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </Button>
      </footer>
    </section>
  );
}
