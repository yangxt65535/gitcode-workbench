"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import type { Issue, IssueMeta } from "@/lib/issues/types";
import {
  DEFAULT_ISSUE_FILTERS,
  IssueFilters,
  type IssueFiltersValue,
} from "./IssueFilters";
import { IssueList } from "./IssueList";
import { IssueDetailPanel } from "./IssueDetailPanel";
import { RepoConfirmBar } from "./RepoConfirmBar";
import styles from "./IssuesWorkbench.module.css";

function appendCsv(
  params: URLSearchParams,
  key: string,
  values: string[],
): void {
  if (values.length > 0) params.set(key, values.join(","));
}

function buildIssuesUrl(
  org: string,
  repo: string,
  filters: IssueFiltersValue,
): string {
  const params = new URLSearchParams({
    org,
    repo,
    sort: filters.sort,
    direction: filters.direction,
  });
  appendCsv(params, "state", filters.state);
  appendCsv(params, "creator", filters.creator);
  appendCsv(params, "assignee", filters.assignee);
  appendCsv(params, "label", filters.label);
  appendCsv(params, "milestone", filters.milestone);
  appendCsv(params, "type", filters.type);
  return `/api/issues?${params.toString()}`;
}

export function IssuesWorkbench() {
  const { org, repo } = useWorkspace();
  const { token, ready: authReady, clearSession } = useAuth();
  const workspaceKey = `${org.trim()}\0${repo.trim()}`;
  const ready = Boolean(org.trim() && repo.trim());
  const authed = Boolean(token);

  const [filters, setFilters] = useState<IssueFiltersValue>(DEFAULT_ISSUE_FILTERS);
  const [items, setItems] = useState<Issue[]>([]);
  const [meta, setMeta] = useState<IssueMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [boundWorkspace, setBoundWorkspace] = useState(workspaceKey);
  const [retryToken, setRetryToken] = useState(0);
  const metaWorkspaceRef = useRef<string | null>(null);

  if (boundWorkspace !== workspaceKey) {
    setBoundWorkspace(workspaceKey);
    setFilters(DEFAULT_ISSUE_FILTERS);
    setSelectedNumber(null);
    setMeta(null);
    setItems([]);
    setError(null);
    metaWorkspaceRef.current = null;
  }

  useEffect(() => {
    if (!authReady) return;

    if (!authed) {
      setLoading(false);
      setItems([]);
      setMeta(null);
      setError(null);
      metaWorkspaceRef.current = null;
      return;
    }

    if (!ready) {
      setLoading(false);
      setItems([]);
      setMeta(null);
      setError(null);
      metaWorkspaceRef.current = null;
      return;
    }

    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();
    const needMeta = metaWorkspaceRef.current !== workspaceKey;
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (needMeta) {
          const [metaRes, listRes] = await Promise.all([
            fetch(
              `/api/issues/meta?org=${encodeURIComponent(o)}&repo=${encodeURIComponent(r)}`,
              { signal: ac.signal, headers },
            ),
            fetch(buildIssuesUrl(o, r, filters), { signal: ac.signal, headers }),
          ]);
          if (metaRes.status === 401 || listRes.status === 401) {
            clearSession();
            throw new Error("Token 无效，请重新配置");
          }
          if (!metaRes.ok || !listRes.ok) {
            const bad = !metaRes.ok ? metaRes : listRes;
            const body = (await bad.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(body?.message || `加载失败（${bad.status}）`);
          }
          const metaJson = (await metaRes.json()) as { meta: IssueMeta };
          const listJson = (await listRes.json()) as { items: Issue[] };
          metaWorkspaceRef.current = workspaceKey;
          setMeta(metaJson.meta);
          setItems(listJson.items ?? []);
        } else {
          const res = await fetch(buildIssuesUrl(o, r, filters), {
            signal: ac.signal,
            headers,
          });
          if (res.status === 401) {
            clearSession();
            throw new Error("Token 无效，请重新配置");
          }
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            throw new Error(body?.message || `加载失败（${res.status}）`);
          }
          const data = (await res.json()) as { items: Issue[] };
          setItems(data.items ?? []);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : "加载失败");
        setItems([]);
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
    retryToken,
    org,
    repo,
    token,
    clearSession,
  ]);

  const numbers = useMemo(() => items.map((i) => i.number), [items]);

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
            <IssueFilters
              meta={meta}
              value={filters}
              onChange={setFilters}
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
            <IssueList
              items={items}
              selectedNumber={selectedNumber}
              onSelect={setSelectedNumber}
              loading={loading && !error}
            />
          </>
        )}
      </div>
      <div className={styles.right}>
        <IssueDetailPanel
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
