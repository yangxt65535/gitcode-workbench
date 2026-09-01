"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { fetchIssueRelatedPulls } from "@/lib/gitcode/fetchIssueRelatedPulls";
import { fetchOrgUserIssues } from "@/lib/gitcode/fetchOrgUserIssues";
import { fetchOrgUserPulls } from "@/lib/gitcode/fetchOrgUserPulls";
import { fetchPullRelatedIssues } from "@/lib/gitcode/fetchPullRelatedIssues";
import { refreshIssueMeta } from "@/lib/gitcode/refreshIssueMeta";
import { refreshPullMeta } from "@/lib/gitcode/refreshPullMeta";
import { itemKey } from "@/lib/dashboard/itemKey";
import { mergeDashboardMeta } from "@/lib/dashboard/mergeDashboardMeta";
import {
  collectLabels,
  filterByItemKeys,
  filterDashboardItems,
  slicePage,
  sortDashboardItems,
} from "@/lib/dashboard/queryLogic";
import { relatedKeysFromLinks } from "@/lib/dashboard/relatedKeys";
import {
  DEFAULT_ISSUE_PANE_FILTERS,
  DEFAULT_PANE_FILTERS,
  PAGE_SIZE,
  type DashboardIssue,
  type DashboardPaneFilters,
  type DashboardPull,
  type DashboardSelection,
} from "@/lib/dashboard/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { DashboardPane } from "./DashboardPane";
import { OrgConfirmBar } from "./OrgConfirmBar";
import styles from "./DashboardWorkbench.module.css";

/** Empty string = all repos; otherwise exact repo path. */
function resolveRepoList(repo: string): string[] | "all" {
  const trimmed = repo.trim();
  return trimmed ? [trimmed] : "all";
}

function serverStateParam(states: string[]): string | undefined {
  if (states.length === 0) return "all";
  if (states.length === 1) return states[0];
  return "all";
}

export function DashboardWorkbench() {
  const { org } = useWorkspace();
  const { token, username, ready: authReady, clearSession } = useAuth();
  const orgKey = org.trim();
  const ready = Boolean(orgKey);
  const authed = Boolean(token && username);

  const [boundOrg, setBoundOrg] = useState(orgKey);
  const [repoFilter, setRepoFilter] = useState("");
  const [issueFilters, setIssueFilters] = useState<DashboardPaneFilters>(
    DEFAULT_ISSUE_PANE_FILTERS,
  );
  const [pullFilters, setPullFilters] =
    useState<DashboardPaneFilters>(DEFAULT_PANE_FILTERS);
  const [issueRaw, setIssueRaw] = useState<DashboardIssue[]>([]);
  const [pullRaw, setPullRaw] = useState<DashboardPull[]>([]);
  const [issuePage, setIssuePage] = useState(1);
  const [pullPage, setPullPage] = useState(1);
  const [issueLoading, setIssueLoading] = useState(false);
  const [pullLoading, setPullLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<DashboardSelection | null>(null);
  const [relatedKeys, setRelatedKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [issueRefreshingKey, setIssueRefreshingKey] = useState<string | null>(
    null,
  );
  const [pullRefreshingKey, setPullRefreshingKey] = useState<string | null>(
    null,
  );
  const [issueReloadToken, setIssueReloadToken] = useState(0);
  const [pullReloadToken, setPullReloadToken] = useState(0);

  if (boundOrg !== orgKey) {
    setBoundOrg(orgKey);
    setRepoFilter("");
    setIssueFilters(DEFAULT_ISSUE_PANE_FILTERS);
    setPullFilters(DEFAULT_PANE_FILTERS);
    setIssueRaw([]);
    setPullRaw([]);
    setIssuePage(1);
    setPullPage(1);
    setWarnings([]);
    setError(null);
    setSelection(null);
    setRelatedKeys(new Set());
    setRelatedLoading(false);
  }

  const selectedRepos = useMemo(
    () => resolveRepoList(repoFilter),
    [repoFilter],
  );

  // Stable primitives for effect deps (never put string[] directly in deps)
  const issueStateParam = serverStateParam(issueFilters.state);
  const issueSort = issueFilters.sort;
  const issueDirection = issueFilters.direction;
  const issueInvolvement = issueFilters.involvement ?? "all";
  const pullStateParam = serverStateParam(pullFilters.state);
  const pullSort = pullFilters.sort;
  const pullDirection = pullFilters.direction;

  const filteredIssues = useMemo(() => {
    let filtered = filterDashboardItems(
      issueRaw,
      issueFilters,
      selectedRepos,
    );
    if (selection?.side === "pull") {
      filtered = filterByItemKeys(filtered, relatedKeys);
    }
    return sortDashboardItems(
      filtered,
      issueFilters.sort,
      issueFilters.direction,
    );
  }, [issueRaw, issueFilters, selectedRepos, selection, relatedKeys]);

  const filteredPulls = useMemo(() => {
    let filtered = filterDashboardItems(
      pullRaw,
      pullFilters,
      selectedRepos,
    );
    if (selection?.side === "issue") {
      filtered = filterByItemKeys(filtered, relatedKeys);
    }
    return sortDashboardItems(
      filtered,
      pullFilters.sort,
      pullFilters.direction,
    );
  }, [pullRaw, pullFilters, selectedRepos, selection, relatedKeys]);

  const issueTotalPage = Math.max(
    1,
    Math.ceil(filteredIssues.length / PAGE_SIZE) || 1,
  );
  const pullTotalPage = Math.max(
    1,
    Math.ceil(filteredPulls.length / PAGE_SIZE) || 1,
  );

  const issuePageItems = slicePage(filteredIssues, issuePage, PAGE_SIZE);
  const pullPageItems = slicePage(filteredPulls, pullPage, PAGE_SIZE);

  const issueLabels = useMemo(() => collectLabels(issueRaw), [issueRaw]);
  const pullLabels = useMemo(() => collectLabels(pullRaw), [pullRaw]);

  useEffect(() => {
    if (issuePage > issueTotalPage) setIssuePage(issueTotalPage);
  }, [issuePage, issueTotalPage]);

  useEffect(() => {
    if (pullPage > pullTotalPage) setPullPage(pullTotalPage);
  }, [pullPage, pullTotalPage]);

  // Load issues (enterprise list + creator)
  useEffect(() => {
    if (!authReady || !authed || !token || !username || !ready) {
      setIssueRaw([]);
      setIssueLoading(false);
      return;
    }

    const ac = new AbortController();
    async function run() {
      setIssueLoading(true);
      setError(null);
      try {
        const items = await fetchOrgUserIssues({
          token: token!,
          org: orgKey,
          username: username!,
          involvement: issueInvolvement,
          state: issueStateParam,
          sort: issueSort,
          direction: issueDirection,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) setIssueRaw(items);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("登录已失效，请重新配置 Token");
        } else {
          setError(err instanceof Error ? err.message : "加载 Issues 失败");
        }
        setIssueRaw([]);
      } finally {
        if (!ac.signal.aborted) setIssueLoading(false);
      }
    }
    void run();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    token,
    username,
    ready,
    orgKey,
    issueInvolvement,
    issueStateParam,
    issueSort,
    issueDirection,
    issueReloadToken,
    clearSession,
  ]);

  // Load pulls (enterprise list + author; no per-repo fan-out)
  useEffect(() => {
    if (!authReady || !authed || !token || !username || !ready) {
      setPullRaw([]);
      setPullLoading(false);
      return;
    }

    const ac = new AbortController();
    async function run() {
      setPullLoading(true);
      setWarnings([]);
      try {
        const result = await fetchOrgUserPulls({
          token: token!,
          org: orgKey,
          username: username!,
          state: pullStateParam,
          sort: pullSort,
          direction: pullDirection,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setPullRaw(result.items);
        setWarnings(result.warnings);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("登录已失效，请重新配置 Token");
        } else {
          setError(err instanceof Error ? err.message : "加载 PRs 失败");
        }
        setPullRaw([]);
      } finally {
        if (!ac.signal.aborted) setPullLoading(false);
      }
    }
    void run();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    token,
    username,
    ready,
    orgKey,
    pullStateParam,
    pullSort,
    pullDirection,
    pullReloadToken,
    clearSession,
  ]);

  // Related links on selection — opposite pane lists only related items
  useEffect(() => {
    if (!selection || !token || !orgKey) {
      setRelatedKeys(new Set());
      setRelatedLoading(false);
      return;
    }

    const ac = new AbortController();
    setRelatedLoading(true);
    setRelatedKeys(new Set());

    async function run() {
      try {
        if (selection!.side === "issue") {
          const links = await fetchIssueRelatedPulls({
            token: token!,
            org: orgKey,
            repo: selection!.repo,
            number: selection!.number,
            signal: ac.signal,
          });
          if (!ac.signal.aborted) {
            setRelatedKeys(relatedKeysFromLinks(links, selection!.repo));
            setPullPage(1);
          }
        } else {
          const links = await fetchPullRelatedIssues({
            token: token!,
            org: orgKey,
            repo: selection!.repo,
            number: selection!.number,
            signal: ac.signal,
          });
          if (!ac.signal.aborted) {
            setRelatedKeys(relatedKeysFromLinks(links, selection!.repo));
            setIssuePage(1);
          }
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("登录已失效，请重新配置 Token");
        }
        setRelatedKeys(new Set());
      } finally {
        if (!ac.signal.aborted) setRelatedLoading(false);
      }
    }
    void run();
    return () => ac.abort();
  }, [selection, token, orgKey, clearSession]);

  function handleIssueFiltersChange(next: DashboardPaneFilters) {
    setIssueFilters(next);
    setIssuePage(1);
  }

  function handlePullFiltersChange(next: DashboardPaneFilters) {
    setPullFilters(next);
    setPullPage(1);
  }

  function handleConfirmRepo(repo: string) {
    setRepoFilter(repo);
    setIssuePage(1);
    setPullPage(1);
  }

  function toggleSelect(
    side: "issue" | "pull",
    item: DashboardIssue | DashboardPull,
  ) {
    if (
      selection &&
      selection.side === side &&
      selection.repo === item.repo &&
      selection.number === item.number
    ) {
      setSelection(null);
      setRelatedKeys(new Set());
      return;
    }
    setSelection({ side, repo: item.repo, number: item.number });
    setRelatedKeys(new Set());
  }

  async function handleRefreshIssue(item: DashboardIssue) {
    if (!token) return;
    const key = itemKey(item.repo, item.number);
    setIssueRefreshingKey(key);
    try {
      const patch = await refreshIssueMeta({
        token,
        org: orgKey,
        repo: item.repo,
        number: item.number,
      });
      setIssueRaw((prev) =>
        prev.map((i) =>
          i.repo === item.repo && i.number === item.number
            ? mergeDashboardMeta(i, patch)
            : i,
        ),
      );
    } catch (err) {
      if (err instanceof GitCodeHttpError && err.status === 401) {
        clearSession();
        setError("登录已失效，请重新配置 Token");
      } else {
        setError(err instanceof Error ? err.message : "刷新 Issue 失败");
      }
    } finally {
      setIssueRefreshingKey(null);
    }
  }

  async function handleRefreshPull(item: DashboardPull) {
    if (!token) return;
    const key = itemKey(item.repo, item.number);
    setPullRefreshingKey(key);
    try {
      const patch = await refreshPullMeta({
        token,
        org: orgKey,
        repo: item.repo,
        number: item.number,
      });
      setPullRaw((prev) =>
        prev.map((p) =>
          p.repo === item.repo && p.number === item.number
            ? mergeDashboardMeta(p, patch)
            : p,
        ),
      );
    } catch (err) {
      if (err instanceof GitCodeHttpError && err.status === 401) {
        clearSession();
        setError("登录已失效，请重新配置 Token");
      } else {
        setError(err instanceof Error ? err.message : "刷新 PR 失败");
      }
    } finally {
      setPullRefreshingKey(null);
    }
  }

  if (!authReady) {
    return (
      <div className={styles.emptyPage}>
        <EmptyState>正在恢复登录状态…</EmptyState>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className={styles.emptyPage}>
        <EmptyState>请先在右上角配置 GitCode Token</EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <OrgConfirmBar
        disabled={issueLoading || pullLoading}
        repo={repoFilter}
        onConfirmRepo={handleConfirmRepo}
      />
      {!ready ? (
        <div className={styles.needOrg}>
          <EmptyState>请输入组织并确认</EmptyState>
        </div>
      ) : (
        <>
          {error ? <ErrorBanner message={error} /> : null}
          {warnings.length > 0 ? (
            <div className={styles.warnings}>
              部分仓库加载失败：{warnings.slice(0, 3).join("；")}
              {warnings.length > 3 ? ` 等 ${warnings.length} 项` : ""}
            </div>
          ) : null}
          <div className={styles.panes}>
            <DashboardPane
              side="issue"
              title="Issues"
              filters={issueFilters}
              labelOptions={issueLabels}
              onFiltersChange={handleIssueFiltersChange}
              items={issuePageItems}
              loading={
                issueLoading ||
                (selection?.side === "pull" && relatedLoading)
              }
              page={issuePage}
              totalPage={issueTotalPage}
              totalCount={filteredIssues.length}
              onPageChange={setIssuePage}
              selection={selection}
              onSelect={(item) => toggleSelect("issue", item)}
              onRefresh={handleRefreshIssue}
              refreshingKey={issueRefreshingKey}
              headerHint={
                selection?.side === "pull" ? "仅关联" : null
              }
              emptyHint={
                selection?.side === "pull"
                  ? "当前筛选下暂无关联 Issue"
                  : "当前筛选条件下暂无 Issue"
              }
              onReload={() => setIssueReloadToken((t) => t + 1)}
            />
            <div className={styles.divider} />
            <DashboardPane
              side="pull"
              title="Pull Requests"
              filters={pullFilters}
              labelOptions={pullLabels}
              onFiltersChange={handlePullFiltersChange}
              items={pullPageItems}
              loading={
                pullLoading ||
                (selection?.side === "issue" && relatedLoading)
              }
              page={pullPage}
              totalPage={pullTotalPage}
              totalCount={filteredPulls.length}
              onPageChange={setPullPage}
              selection={selection}
              onSelect={(item) => toggleSelect("pull", item)}
              onRefresh={handleRefreshPull}
              refreshingKey={pullRefreshingKey}
              headerHint={
                selection?.side === "issue" ? "仅关联" : null
              }
              emptyHint={
                selection?.side === "issue"
                  ? "当前筛选下暂无关联 PR"
                  : "当前筛选条件下暂无 PR"
              }
              onReload={() => setPullReloadToken((t) => t + 1)}
            />
          </div>
        </>
      )}
    </div>
  );
}
