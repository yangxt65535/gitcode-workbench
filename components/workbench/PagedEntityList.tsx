"use client";

import { type ReactNode } from "react";
import { EntityPager } from "./EntityPager";
import styles from "./EntityList.module.css";

type PagedEntityListProps = {
  loading?: boolean;
  emptyHint: string;
  itemCount: number;
  page: number;
  /** 当前已知总页数（渐进加载中为估计值）。 */
  totalPage: number;
  totalCount: number;
  /** 总数仍会增长（渐进加载中或达到页数上限）。 */
  countApprox: boolean;
  /** 数据尚未加载完，允许向后试翻。 */
  hasMore: boolean;
  /** 请求进行中：禁用分页控件。 */
  disabled: boolean;
  loadingMore: boolean;
  onPageChange: (page: number) => void;
  children: ReactNode;
};

export function PagedEntityList({
  loading,
  emptyHint,
  itemCount,
  page,
  totalPage,
  totalCount,
  countApprox,
  hasMore,
  disabled,
  loadingMore,
  onPageChange,
  children,
}: PagedEntityListProps) {
  return (
    <div className={styles.wrap}>
      {loading ? (
        <div className={styles.root} aria-busy="true" aria-label="加载中">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : itemCount === 0 ? (
        <div className={styles.emptyHint}>{emptyHint}</div>
      ) : (
        <div className={styles.root} role="list">
          {children}
        </div>
      )}

      <div className={styles.pager}>
        <EntityPager
          page={page}
          totalPage={totalPage}
          totalCount={totalCount}
          countApprox={countApprox}
          hasMore={hasMore}
          disabled={disabled}
          loadingMore={loadingMore}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
