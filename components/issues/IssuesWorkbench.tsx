"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { useProgressiveStreams } from "@/lib/dashboard/useProgressiveStreams";
import { GitCodeIssueRepository } from "@/lib/issues/gitcodeIssueRepository";
import { LIST_MAX_PAGES, type Issue, type IssueMeta } from "@/lib/issues/types";
import { isConfirmedRepoListReady } from "@/lib/workspace/listReady";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import {
  DEFAULT_ISSUE_FILTERS,
  IssueFilters,
  type IssueFiltersValue,
} from "./IssueFilters";
import { IssueList } from "./IssueList";
import { IssueDetailPanel } from "./IssueDetailPanel";
import { RepoConfirmBar } from "./RepoConfirmBar";
import styles from "@/components/workbench/WorkbenchLayout.module.css";

const PER_PAGE = 20;

export function IssuesWorkbench() {
  const { org, repo, repoConfirmed } = useWorkspace();
  const { token, ready: authReady, clearSession } = useAuth();
  const workspaceKey = `${org.trim()}\0${repo.trim()}`;
  const ready = isConfirmedRepoListReady({ org, repo, repoConfirmed });
  const authed = Boolean(token);

  const [filters, setFilters] = useState<IssueFiltersValue>(DEFAULT_ISSUE_FILTERS);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<IssueMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [boundWorkspace, setBoundWorkspace] = useState(workspaceKey);
  const [metaReloadToken, setMetaReloadToken] = useState(0);
  const metaWorkspaceRef = useRef<string | null>(null);

  if (boundWorkspace !== workspaceKey) {
    setBoundWorkspace(workspaceKey);
    setFilters(DEFAULT_ISSUE_FILTERS);
    setPage(1);
    setSelectedNumber(null);
    setMeta(null);
    setError(null);
    metaWorkspaceRef.current = null;
  }

  const listQuery = useMemo(
    () => ({
      org: org.trim(),
      repo: repo.trim(),
      state: filters.state,
      creator: filters.creator,
      assignee: filters.assignee,
      label: filters.label,
      milestone: filters.milestone,
      search: filters.search.trim() || undefined,
      sort: filters.sort,
      direction: filters.direction,
    }),
    [org, repo, filters],
  );

  const stream = useProgressiveStreams<Issue>({
    queryKey: ready && authed ? JSON.stringify([workspaceKey, filters]) : null,
    enabled: authReady && authed && ready,
    streams: ["issues"],
    serverPerPage: PER_PAGE,
    displayPageSize: PER_PAGE,
    maxServerPages: LIST_MAX_PAGES,
    background: true,
    fetchPage: (_stream, pageNumber, signal) => {
      const repository = new GitCodeIssueRepository(token ?? "");
      return repository.fetchPage(listQuery, pageNumber, PER_PAGE, signal);
    },
    getKey: (item) => String(item.number),
    onUnauthorized: clearSession,
  });

  // meta 与列表独立：标签/里程碑/创建者选项只随 workspace 或手动刷新重拉
  useEffect(() => {
    if (!authReady || !authed || !ready || !token) return;
    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();
    if (metaWorkspaceRef.current === `${o}\0${r}`) return;
    const repository = new GitCodeIssueRepository(token);
    repository
      .meta(o, r)
      .then((metaJson) => {
        if (ac.signal.aborted) return;
        metaWorkspaceRef.current = `${o}\0${r}`;
        setMeta(metaJson);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        }
      });
    return () => ac.abort();
  }, [authReady, authed, ready, workspaceKey, metaReloadToken, org, repo, token, clearSession]);

  function handleFiltersChange(next: IssueFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  /** 筛选区「确认」兼刷新：强制重拉列表与 meta。 */
  function handleReload() {
    setPage(1);
    metaWorkspaceRef.current = null;
    setMetaReloadToken((t) => t + 1);
    stream.reload();
  }

  const numbers = useMemo(() => stream.items.map((i) => i.number), [stream.items]);

  if (!authReady) {
    return (
      <div className={styles.emptyPage}>
        <EmptyState>加载中…</EmptyState>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={styles.emptyPage}>
        <EmptyState>请先配置 GitCode Token</EmptyState>
      </div>
    );
  }

  const bannerError = error ?? stream.error;
  const pagerDisabled = stream.initialLoading || stream.loadingMore;
  const pageItems = stream.items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <RepoConfirmBar retainStoredRepo={repoConfirmed} />
        {!ready ? (
          <div className={styles.leftEmpty}>
            <EmptyState>请填写组织和仓库并确认</EmptyState>
          </div>
        ) : (
          <>
            <IssueFilters
              meta={meta}
              value={filters}
              onChange={handleFiltersChange}
              onReload={handleReload}
            />
            {bannerError ? (
              <ErrorBanner
                message={bannerError}
                action={
                  <Button variant="secondary" onClick={handleReload}>
                    重试
                  </Button>
                }
              />
            ) : null}
            <IssueList
              items={pageItems}
              selectedNumber={selectedNumber}
              onSelect={setSelectedNumber}
              loading={stream.initialLoading}
              page={page}
              totalPage={Math.max(1, Math.ceil(stream.items.length / PER_PAGE))}
              totalCount={stream.items.length}
              countApprox={!stream.exhausted}
              hasMore={!stream.exhausted}
              disabled={pagerDisabled}
              loadingMore={stream.loadingMore}
              onPageChange={(next) => {
                setPage(next);
                stream.ensureDisplayPage(next);
              }}
            />
          </>
        )}
      </div>
      <div className={styles.right}>
        <IssueDetailPanel
          org={org.trim()}
          repo={repo.trim()}
          numbers={stream.initialLoading || !ready ? [] : numbers}
          selectedNumber={selectedNumber}
          onSelect={setSelectedNumber}
        />
      </div>
    </div>
  );
}
