"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import type { Issue } from "@/lib/issues/types";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { IssueListItem } from "./IssueListItem";
import styles from "./IssueList.module.css";

type IssueListProps = {
  items: Issue[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
  loading?: boolean;
  page: number;
  perPage: number;
  totalPage: number | null;
  totalCount: number | null;
  onPageChange: (page: number) => void;
};

export function IssueList({
  items,
  selectedNumber,
  onSelect,
  loading,
  page,
  perPage,
  totalPage,
  totalCount,
  onPageChange,
}: IssueListProps) {
  const knownTotalPage = totalPage != null && totalPage > 0 ? totalPage : null;
  const canPrev = page > 1;
  const canNext =
    knownTotalPage != null ? page < knownTotalPage : items.length >= perPage;

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

  return (
    <div className={styles.wrap}>
      {loading ? (
        <div className={styles.root} aria-busy="true" aria-label="加载中">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyHint}>当前筛选条件下暂无 Issue</div>
      ) : (
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
      )}

      <div className={styles.pager}>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || !canPrev}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </Button>
        <div className={styles.pagerMid}>
          <span className={styles.pagerInfo}>第</span>
          <div className={styles.pageInput}>
            <TextInput
              value={pageDraft}
              onChange={(e) => setPageDraft(e.target.value)}
              onKeyDown={onPageKeyDown}
              disabled={loading}
              aria-label="跳转到页码"
            />
          </div>
          <span className={styles.pagerInfo}>
            {knownTotalPage != null ? `/ ${knownTotalPage} ` : ""}页
            {totalCount != null ? ` · 共 ${totalCount}` : ""}
          </span>
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
  );
}
