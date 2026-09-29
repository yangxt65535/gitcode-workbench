"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./EntityPager.module.css";

type EntityPagerProps = {
  page: number;
  /** 当前已知总页数（渐进加载中为估计值，随加载递增）。 */
  totalPage: number;
  totalCount: number;
  /** 总数仍会增长（渐进加载中或达到页数上限）。 */
  countApprox: boolean;
  /** 数据尚未加载完，允许向后试翻。 */
  hasMore: boolean;
  /** 请求进行中：禁用全部分页按钮与输入框。 */
  disabled: boolean;
  loadingMore: boolean;
  onPageChange: (page: number) => void;
};

export function EntityPager({
  page,
  totalPage,
  totalCount,
  countApprox,
  hasMore,
  disabled,
  loadingMore,
  onPageChange,
}: EntityPagerProps) {
  const canPrev = page > 1;
  const canNext = hasMore || page < Math.max(totalPage, 1);

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
    // 加载未完成时总数是估计值，允许超出试翻（由数据流按需补页）
    if (!hasMore && next > totalPage) next = totalPage;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function onPageKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") jumpToPage();
  }

  return (
    <div className={styles.bar}>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || !canPrev}
        onClick={() => onPageChange(page - 1)}
      >
        上一页
      </Button>
      <span className={styles.summary}>
        第 {page} / {Math.max(totalPage, 1)} 页 · 共 {totalCount}
        {countApprox ? "+" : ""}
        {loadingMore ? " · 加载中…" : ""}
      </span>
      <div className={styles.jump}>
        <span className={styles.info}>跳至</span>
        <div className={styles.pageInput}>
          <TextInput
            value={pageDraft}
            onChange={(e) => setPageDraft(e.target.value)}
            onKeyDown={onPageKeyDown}
            disabled={disabled}
            aria-label="跳转到页码"
          />
        </div>
        <span className={styles.info}>页</span>
        <Button
          type="button"
          variant="primary"
          disabled={disabled}
          onClick={jumpToPage}
        >
          Go
        </Button>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || !canNext}
        onClick={() => onPageChange(page + 1)}
      >
        下一页
      </Button>
    </div>
  );
}
