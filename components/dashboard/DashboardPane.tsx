"use client";

import { DashboardListItem } from "./DashboardListItem";
import { PaneFilters } from "./PaneFilters";
import { EntityPager } from "@/components/workbench/EntityPager";
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
  /** 当前已知总页数（渐进加载中为估计值，随加载递增）。 */
  totalPage: number;
  totalCount: number;
  /** 总数仍可能增长（渐进加载中或达到页数上限）。 */
  countApprox: boolean;
  /** 数据尚未加载完，允许向后试翻。 */
  hasMore: boolean;
  /** 请求进行中：仅禁用分页控件（筛选/确认栏保持可用）。 */
  pagerDisabled: boolean;
  loadingMore: boolean;
  onPageChange: (page: number) => void;
  selection: DashboardSelection | null;
  onSelect: (item: T) => void;
  onRefresh?: (item: T) => void;
  refreshingKey?: string | null;
  emptyHint: string;
  headerHint?: string | null;
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
  countApprox,
  hasMore,
  pagerDisabled,
  loadingMore,
  onPageChange,
  selection,
  onSelect,
  onRefresh,
  refreshingKey = null,
  emptyHint,
  headerHint,
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
      </header>
      <PaneFilters
        side={side}
        value={filters}
        labelOptions={labelOptions}
        onChange={onFiltersChange}
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
        <EntityPager
          page={page}
          totalPage={totalPage}
          totalCount={totalCount}
          countApprox={countApprox}
          hasMore={hasMore}
          disabled={pagerDisabled}
          loadingMore={loadingMore}
          onPageChange={onPageChange}
        />
      </footer>
    </section>
  );
}
