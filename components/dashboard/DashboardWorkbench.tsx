"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { fetchIssueRelatedPulls } from "@/lib/gitcode/fetchIssueRelatedPulls";
import { fetchOrgUserIssuesPage } from "@/lib/gitcode/fetchOrgUserIssues";
import { fetchOrgUserPullsPage } from "@/lib/gitcode/fetchOrgUserPulls";
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
  MAX_ISSUES_PAGES,
  MAX_PULL_PAGES_PER_REPO,
  ORG_LIST_PER_PAGE,
  PAGE_SIZE,
  type DashboardIssue,
  type DashboardPaneFilters,
  type DashboardPull,
  type DashboardSelection,
} from "@/lib/dashboard/types";
import { useProgressiveStreams } from "@/lib/dashboard/useProgressiveStreams";
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
  const [issuePage, setIssuePage] = useState(1);
  const [pullPage, setPullPage] = useState(1);
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

  if (boundOrg !== orgKey) {
    setBoundOrg(orgKey);
    setRepoFilter("");
    setIssueFilters(DEFAULT_ISSUE_PANE_FILTERS);
    setPullFilters(DEFAULT_PANE_FILTERS);
    setIssuePage(1);
    setPullPage(1);
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

  const streamsEnabled = authReady && authed && ready;

  const issueStream = useProgressiveStreams<DashboardIssue>({
    queryKey: JSON.stringify([
      orgKey,
      issueInvolvement,
      issueStateParam,
      issueSort,
      issueDirection,
    ]),
    enabled: streamsEnabled,
    streams:
      issueInvolvement === "all"
        ? ["created", "assigned"]
        : [issueInvolvement],
    serverPerPage: ORG_LIST_PER_PAGE,
    displayPageSize: PAGE_SIZE,
    maxServerPages: MAX_ISSUES_PAGES,
    background: true,
    fetchPage: (stream, page, signal) =>
      fetchOrgUserIssuesPage({
        token: token!,
        org: orgKey,
        username: username!,
        involvement: stream === "assigned" ? "assigned" : "created",
        state: issueStateParam,
        sort: issueSort,
        direction: issueDirection,
        page,
        perPage: ORG_LIST_PER_PAGE,
        signal,
      }),
    getKey: (item) => itemKey(item.repo, item.number),
    onUnauthorized: clearSession,
  });

  const pullStream = useProgressiveStreams<DashboardPull>({
    queryKey: JSON.stringify([
      orgKey,
      pullStateParam,
      pullSort,
      pullDirection,
    ]),
    enabled: streamsEnabled,
    streams: ["author"],
    serverPerPage: ORG_LIST_PER_PAGE,
    displayPageSize: PAGE_SIZE,
    maxServerPages: MAX_PULL_PAGES_PER_REPO,
    background: true,
    fetchPage: (_stream, page, signal) =>
      fetchOrgUserPullsPage({
        token: token!,
        org: orgKey,
        username: username!,
        state: pullStateParam,
        sort: pullSort,
        direction: pullDirection,
        page,
        perPage: ORG_LIST_PER_PAGE,
        signal,
      }),
    getKey: (item) => itemKey(item.repo, item.number),
    onUnauthorized: clearSession,
  });

  const filteredIssues = useMemo(() => {
    let filtered = filterDashboardItems(
      issueStream.items,
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
  }, [issueStream.items, issueFilters, selectedRepos, selection, relatedKeys]);

  const filteredPulls = useMemo(() => {
    let filtered = filterDashboardItems(
      pullStream.items,
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
  }, [pullStream.items, pullFilters, selectedRepos, selection, relatedKeys]);

  const issueLoadedPageCount = Math.max(
    1,
    Math.ceil(filteredIssues.length / PAGE_SIZE),
  );
  const pullLoadedPageCount = Math.max(
    1,
    Math.ceil(filteredPulls.length / PAGE_SIZE),
  );
  const issueTotalPage = issueLoadedPageCount;
  const pullTotalPage = pullLoadedPageCount;
  const issueCountApprox = !issueStream.exhausted || issueStream.capped;
  const pullCountApprox = !pullStream.exhausted || pullStream.capped;

  const issuePageItems = slicePage(filteredIssues, issuePage, PAGE_SIZE);
  const pullPageItems = slicePage(filteredPulls, pullPage, PAGE_SIZE);

  const issueLabels = useMemo(
    () => collectLabels(issueStream.items),
    [issueStream.items],
  );
  const pullLabels = useMemo(
    () => collectLabels(pullStream.items),
    [pullStream.items],
  );

  // 仅在加载完毕后收敛页码；渐进加载中估计页数会递增，不能 clamp
  useEffect(() => {
    if (issueStream.exhausted && issuePage > issueTotalPage) {
      setIssuePage(issueTotalPage);
    }
  }, [issuePage, issueTotalPage, issueStream.exhausted]);

  useEffect(() => {
    if (pullStream.exhausted && pullPage > pullTotalPage) {
      setPullPage(pullTotalPage);
    }
  }, [pullPage, pullTotalPage, pullStream.exhausted]);

  // Related links on selection — opposite pane lists only related items.
  // Also accelerate loading the opposite pane so the relation filter is
  // computed over the full dataset.
  const {
    exhausted: issuesExhausted,
    ensureAll: ensureAllIssues,
  } = issueStream;
  useEffect(() => {
    if (selection?.side === "pull" && !issuesExhausted) {
      ensureAllIssues();
    }
  }, [selection, issuesExhausted, ensureAllIssues]);

  const {
    exhausted: pullsExhausted,
    ensureAll: ensureAllPulls,
  } = pullStream;
  useEffect(() => {
    if (selection?.side === "issue" && !pullsExhausted) {
      ensureAllPulls();
    }
  }, [selection, pullsExhausted, ensureAllPulls]);

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
    // 确认兼刷新：值未变时 queryKey 不动，这里强制重拉
    issueStream.reload();
    pullStream.reload();
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
      issueStream.updateItems((prev) =>
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
      pullStream.updateItems((prev) =>
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

  const bannerMessage = error ?? issueStream.error ?? pullStream.error;

  return (
    <div className={styles.root}>
      <OrgConfirmBar
        repo={repoFilter}
        onConfirmRepo={handleConfirmRepo}
      />
      {!ready ? (
        <div className={styles.needOrg}>
          <EmptyState>请输入组织并确认</EmptyState>
        </div>
      ) : (
        <>
          {bannerMessage ? <ErrorBanner message={bannerMessage} /> : null}
          <div className={styles.panes}>
            <DashboardPane
              side="issue"
              title="Issues"
              filters={issueFilters}
              labelOptions={issueLabels}
              onFiltersChange={handleIssueFiltersChange}
              items={issuePageItems}
              loading={
                issueStream.initialLoading ||
                (selection?.side === "pull" && relatedLoading)
              }
              page={issuePage}
              totalPage={issueTotalPage}
              totalCount={filteredIssues.length}
              countApprox={issueCountApprox}
              hasMore={!issueStream.exhausted}
              pagerDisabled={
                issueStream.initialLoading || issueStream.loadingMore
              }
              loadingMore={
                issueStream.loadingMore && !issueStream.initialLoading
              }
              onPageChange={(next) => {
                setIssuePage(next);
                issueStream.ensureDisplayPage(next);
              }}
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
                  : !issueStream.exhausted
                    ? "暂无匹配数据，仍在加载更多…"
                    : "当前筛选条件下暂无 Issue"
              }
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
                pullStream.initialLoading ||
                (selection?.side === "issue" && relatedLoading)
              }
              page={pullPage}
              totalPage={pullTotalPage}
              totalCount={filteredPulls.length}
              countApprox={pullCountApprox}
              hasMore={!pullStream.exhausted}
              pagerDisabled={
                pullStream.initialLoading || pullStream.loadingMore
              }
              loadingMore={
                pullStream.loadingMore && !pullStream.initialLoading
              }
              onPageChange={(next) => {
                setPullPage(next);
                pullStream.ensureDisplayPage(next);
              }}
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
                  : !pullStream.exhausted
                    ? "暂无匹配数据，仍在加载更多…"
                    : "当前筛选条件下暂无 PR"
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
