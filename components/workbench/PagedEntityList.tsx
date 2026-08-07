"use client";

import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./EntityList.module.css";

type PagedEntityListProps = {
  loading?: boolean;
  emptyHint: string;
  itemCount: number;
  page: number;
  perPage: number;
  totalPage: number | null;
  totalCount: number | null;
  onPageChange: (page: number) => void;
  children: ReactNode;
};

export function PagedEntityList({
  loading,
  emptyHint,
  itemCount,
  page,
  perPage,
  totalPage,
  totalCount,
  onPageChange,
  children,
}: PagedEntityListProps) {
  const knownTotalPage = totalPage != null && totalPage > 0 ? totalPage : null;
  const canPrev = page > 1;
  const canNext =
    knownTotalPage != null ? page < knownTotalPage : itemCount >= perPage;

  const [pageDraft, setPageDraft] = useState(String(page));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  function jumpToPage() {
    const raw = pageDraft.trim();
    if (!/^\d+$/.test(raw)) {
      setPageDraft(String(page));
      return;
    }
    let next = Number(raw);
    if (next < 1) next = 1;
    if (knownTotalPage != null && next > knownTotalPage) {
      next = knownTotalPage;
    }
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function onPageKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") jumpToPage();
  }

  const summary =
    knownTotalPage != null
      ? `第 ${page} / ${knownTotalPage} 页${
          totalCount != null ? ` · 共 ${totalCount}` : ""
        }`
      : `第 ${page} 页${totalCount != null ? ` · 共 ${totalCount}` : ""}`;

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
        <div className={styles.pagerSummary}>{summary}</div>
        <div className={styles.pagerControls}>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            上一页
          </Button>
          <div className={styles.pagerJump}>
            <span className={styles.pagerInfo}>跳至</span>
            <div className={styles.pageInput}>
              <TextInput
                value={pageDraft}
                onChange={(e) => setPageDraft(e.target.value)}
                onKeyDown={onPageKeyDown}
                disabled={loading}
                aria-label="跳转到页码"
              />
            </div>
            <span className={styles.pagerInfo}>页</span>
            <Button
              type="button"
              variant="primary"
              disabled={loading}
              onClick={jumpToPage}
            >
              Go
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !canNext}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
