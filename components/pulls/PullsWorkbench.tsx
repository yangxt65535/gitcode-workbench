"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { GitCodePullRepository } from "@/lib/pulls/gitcodePullRepository";
import type { Pull, PullMeta } from "@/lib/pulls/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { RepoConfirmBar } from "@/components/issues/RepoConfirmBar";
import {
  DEFAULT_PULL_FILTERS,
  PullFilters,
  type PullFiltersValue,
} from "./PullFilters";
import { PullList } from "./PullList";
import { PullDetailPanel } from "./PullDetailPanel";
import styles from "./PullsWorkbench.module.css";

const DEFAULT_PER_PAGE = 20;

export function PullsWorkbench() {
  const { org, repo } = useWorkspace();
  const { token, ready: authReady, clearSession } = useAuth();
  const workspaceKey = `${org.trim()}\0${repo.trim()}`;
  const ready = Boolean(org.trim() && repo.trim());
  const authed = Boolean(token);

  const [filters, setFilters] = useState<PullFiltersValue>(DEFAULT_PULL_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Pull[]>([]);
  const [totalPage, setTotalPage] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [meta, setMeta] = useState<PullMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [boundWorkspace, setBoundWorkspace] = useState(workspaceKey);
  const [retryToken, setRetryToken] = useState(0);
  const metaWorkspaceRef = useRef<string | null>(null);

  if (boundWorkspace !== workspaceKey) {
    setBoundWorkspace(workspaceKey);
    setFilters(DEFAULT_PULL_FILTERS);
    setPage(1);
    setSelectedNumber(null);
    setMeta(null);
    setItems([]);
    setTotalPage(null);
    setTotalCount(null);
    setError(null);
    metaWorkspaceRef.current = null;
  }

  function handleFiltersChange(next: PullFiltersValue) {
    setFilters(next);
    setPage(1);
  }

  useEffect(() => {
    if (!authReady) return;

    if (!authed || !token) {
      setLoading(false);
      setItems([]);
      setMeta(null);
      setTotalPage(null);
      setTotalCount(null);
      setError(null);
      metaWorkspaceRef.current = null;
      return;
    }

    if (!ready) {
      setLoading(false);
      setItems([]);
      setMeta(null);
      setTotalPage(null);
      setTotalCount(null);
      setError(null);
      metaWorkspaceRef.current = null;
      return;
    }

    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();
    const needMeta = metaWorkspaceRef.current !== workspaceKey;
    const repository = new GitCodePullRepository(token);

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const listQuery = {
          org: o,
          repo: r,
          state: filters.state,
          creator: filters.creator,
          base: filters.base,
          label: filters.label,
          milestone: filters.milestone,
          search: filters.search.trim() || undefined,
          sort: filters.sort,
          direction: filters.direction,
          page,
          per_page: DEFAULT_PER_PAGE,
        };

        if (needMeta) {
          const [metaJson, listJson] = await Promise.all([
            repository.meta(o, r),
            repository.list(listQuery),
          ]);
          if (ac.signal.aborted) return;
          metaWorkspaceRef.current = workspaceKey;
          setMeta(metaJson);
          setItems(listJson.items ?? []);
          setTotalPage(listJson.total_page);
          setTotalCount(listJson.total_count);
        } else {
          const listJson = await repository.list(listQuery);
          if (ac.signal.aborted) return;
          setItems(listJson.items ?? []);
          setTotalPage(listJson.total_page);
          setTotalCount(listJson.total_count);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载失败");
        }
        setItems([]);
        setTotalPage(null);
        setTotalCount(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    void run();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    ready,
    workspaceKey,
    filters,
    page,
    retryToken,
    org,
    repo,
    token,
    clearSession,
  ]);

  const numbers = useMemo(() => items.map((p) => p.number), [items]);

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

  return (
    <div className={styles.root}>
      <div className={styles.left}>
        <RepoConfirmBar disabled={loading} />
        {!ready ? (
          <div className={styles.leftEmpty}>
            <EmptyState>请填写组织和仓库并确认</EmptyState>
          </div>
        ) : (
          <>
            <PullFilters
              meta={meta}
              value={filters}
              onChange={handleFiltersChange}
              disabled={loading}
            />
            {error ? (
              <ErrorBanner
                message={error}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      metaWorkspaceRef.current = null;
                      setRetryToken((t) => t + 1);
                    }}
                  >
                    重试
                  </Button>
                }
              />
            ) : null}
            <PullList
              items={items}
              selectedNumber={selectedNumber}
              onSelect={setSelectedNumber}
              loading={loading && !error}
              page={page}
              perPage={DEFAULT_PER_PAGE}
              totalPage={totalPage}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      <div className={styles.right}>
        <PullDetailPanel
          org={org.trim()}
          repo={repo.trim()}
          numbers={loading || !ready ? [] : numbers}
          selectedNumber={selectedNumber}
          onSelect={setSelectedNumber}
        />
      </div>
    </div>
  );
}
