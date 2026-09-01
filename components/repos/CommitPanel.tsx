"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import type { ClassifiedCommit, CommitDiffKind } from "@/lib/repos/types";
import styles from "./CommitPanel.module.css";

type CommitPanelProps = {
  title: string;
  branch: string;
  branches: string[];
  items: ClassifiedCommit[];
  loading?: boolean;
  disabled?: boolean;
  emptyHint?: string;
  lastSharedSha?: string | null;
  scrollToLastSharedToken?: number;
  page: number;
  totalPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onBranchChange: (branch: string) => void;
  onRefresh?: () => void;
};

const KIND_LABEL: Record<CommitDiffKind, string> = {
  shared: "共有",
  upstream_only: "仅主仓",
  fork_only: "仅 Fork",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CommitPanel({
  title,
  branch,
  branches,
  items,
  loading,
  disabled,
  emptyHint,
  lastSharedSha,
  scrollToLastSharedToken = 0,
  page,
  totalPage,
  totalCount,
  onPageChange,
  onBranchChange,
  onRefresh,
}: CommitPanelProps) {
  const listWrapRef = useRef<HTMLDivElement>(null);
  const [pageDraft, setPageDraft] = useState(String(page));

  useEffect(() => {
    setPageDraft(String(page));
  }, [page]);

  useEffect(() => {
    if (!scrollToLastSharedToken || !lastSharedSha || loading) return;
    const container = listWrapRef.current;
    if (!container) return;
    const item = container.querySelector<HTMLElement>(
      `[data-commit-sha="${lastSharedSha}"]`,
    );
    if (!item) return;
    const top =
      item.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop;
    container.scrollTo({ top, behavior: "smooth" });
  }, [scrollToLastSharedToken, lastSharedSha, loading, items]);

  function jumpToPage() {
    const raw = pageDraft.trim();
    if (!/^\d+$/.test(raw)) {
      setPageDraft(String(page));
      return;
    }
    let next = Number(raw);
    if (next < 1) next = 1;
    if (next > totalPage) next = totalPage;
    setPageDraft(String(next));
    if (next !== page) onPageChange(next);
  }

  function onPageKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") jumpToPage();
  }

  const summary = `第 ${page} / ${totalPage} 页 · 共 ${totalCount}`;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <div className={styles.headerActions}>
          <label className={styles.branchField}>
            <span className={styles.branchLabel}>分支</span>
            <select
              className={styles.select}
              value={branch}
              disabled={disabled || loading || branches.length === 0}
              onChange={(e) => onBranchChange(e.target.value)}
            >
              {branches.length === 0 ? (
                <option value={branch}>{branch || "—"}</option>
              ) : (
                branches.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))
              )}
            </select>
          </label>
          {onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              disabled={disabled || loading}
              onClick={onRefresh}
            >
              刷新
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={listWrapRef}
        className={styles.listWrap}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <div className={styles.hint}>加载 commit…</div>
        ) : items.length === 0 ? (
          <div className={styles.hint}>{emptyHint || "暂无 commit"}</div>
        ) : (
          <ul className={styles.list}>
            {items.map(({ commit, kind }) => {
              const isLastShared =
                lastSharedSha != null && commit.sha === lastSharedSha;
              return (
                <li
                  key={commit.sha}
                  data-commit-sha={commit.sha}
                  className={`${styles.item} ${isLastShared ? styles.itemLastShared : ""}`}
                >
                  <span
                    className={`${styles.kindDot} ${isLastShared ? styles.lastSharedDot : styles[kind]}`}
                    title={isLastShared ? "最后共有 commit" : KIND_LABEL[kind]}
                    aria-label={
                      isLastShared ? "最后共有 commit" : KIND_LABEL[kind]
                    }
                  />
                  <div className={styles.body}>
                    <div className={styles.row1}>
                      {commit.html_url ? (
                        <a
                          className={styles.sha}
                          href={commit.html_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {commit.short_sha}
                        </a>
                      ) : (
                        <span className={styles.sha}>{commit.short_sha}</span>
                      )}
                      {isLastShared ? (
                        <span className={styles.lastSharedTag}>最后共有</span>
                      ) : (
                        <span className={styles.kindTag}>
                          {KIND_LABEL[kind]}
                        </span>
                      )}
                    </div>
                    <div className={styles.message}>{commit.message}</div>
                    <div className={styles.meta}>
                      {commit.author_login} · {formatTime(commit.author_date)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.pager}>
        <div className={styles.pagerSummary}>{summary}</div>
        <div className={styles.pagerControls}>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || page <= 1}
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
            disabled={loading || page >= totalPage}
            onClick={() => onPageChange(page + 1)}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
