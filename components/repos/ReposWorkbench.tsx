"use client";

import { useEffect, useMemo, useState } from "react";
import { RepoConfirmBar } from "@/components/issues/RepoConfirmBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import {
  fetchAllCommits,
  fetchBranches,
  fetchRepoDetail,
  resolveForkRepo,
} from "@/lib/gitcode/fetchRepoData";
import {
  classifyForkCommits,
  classifyUpstreamCommits,
  computeFullDiffStats,
  indexOfSha,
  pageForCommitIndex,
  shaSet,
  sliceCommitPage,
  totalPages,
} from "@/lib/repos/commitDiff";
import type { ForkInfo, RepoCommit } from "@/lib/repos/types";
import { useWorkspace } from "@/lib/workspace/WorkspaceContext";
import { CommitPanel } from "./CommitPanel";
import { ForkStatusCard } from "./ForkStatusCard";
import styles from "./ReposWorkbench.module.css";

const COMMITS_PER_PAGE = 30;

export function ReposWorkbench() {
  const { org, repo } = useWorkspace();
  const { token, username, ready: authReady, clearSession } = useAuth();
  const workspaceKey = `${org.trim()}\0${repo.trim()}`;
  const ready = Boolean(org.trim() && repo.trim());
  const authed = Boolean(token);

  const [boundWorkspace, setBoundWorkspace] = useState(workspaceKey);
  const [fork, setFork] = useState<ForkInfo | null>(null);
  const [forkChecked, setForkChecked] = useState(false);
  const [forkOwnerDraft, setForkOwnerDraft] = useState("");
  const [forkOwner, setForkOwner] = useState("");
  const [upstreamBranch, setUpstreamBranch] = useState("main");
  const [forkBranch, setForkBranch] = useState("main");
  const [upstreamDefaultBranch, setUpstreamDefaultBranch] = useState("main");
  const [upstreamBranches, setUpstreamBranches] = useState<string[]>([]);
  const [forkBranches, setForkBranches] = useState<string[]>([]);
  const [upstreamAll, setUpstreamAll] = useState<RepoCommit[]>([]);
  const [forkAll, setForkAll] = useState<RepoCommit[]>([]);
  const [upstreamPage, setUpstreamPage] = useState(1);
  const [forkPage, setForkPage] = useState(1);
  const [metaLoading, setMetaLoading] = useState(false);
  const [forkResolving, setForkResolving] = useState(false);
  const [upstreamLoading, setUpstreamLoading] = useState(false);
  const [forkLoading, setForkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [scrollToLastSharedToken, setScrollToLastSharedToken] = useState(0);
  const [pendingScrollSha, setPendingScrollSha] = useState<string | null>(null);
  const [metaReadyKey, setMetaReadyKey] = useState<string | null>(null);

  if (boundWorkspace !== workspaceKey) {
    setBoundWorkspace(workspaceKey);
    setFork(null);
    setForkChecked(false);
    const defaultOwner = username?.trim() || "";
    setForkOwnerDraft(defaultOwner);
    setForkOwner(defaultOwner);
    setUpstreamBranch("main");
    setForkBranch("main");
    setUpstreamDefaultBranch("main");
    setUpstreamBranches([]);
    setForkBranches([]);
    setUpstreamAll([]);
    setForkAll([]);
    setUpstreamPage(1);
    setForkPage(1);
    setError(null);
    setMetaReadyKey(null);
    setPendingScrollSha(null);
  }

  useEffect(() => {
    if (!authReady || !authed || !token || !ready) {
      setMetaLoading(false);
      setFork(null);
      setForkChecked(false);
      setUpstreamBranches([]);
      setForkBranches([]);
      setMetaReadyKey(null);
      return;
    }

    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();
    const defaultOwner = username?.trim() || "";

    async function loadMeta() {
      setMetaLoading(true);
      setError(null);
      setForkChecked(false);
      try {
        const [detail, branches] = await Promise.all([
          fetchRepoDetail({ token: token!, org: o, repo: r, signal: ac.signal }),
          fetchBranches({ token: token!, org: o, repo: r, signal: ac.signal }),
        ]);
        if (ac.signal.aborted) return;

        const branchNames = branches.map((b) => b.name);
        const defaultBranch = branchNames.includes(detail.default_branch)
          ? detail.default_branch
          : branchNames[0] || detail.default_branch;

        setUpstreamBranches(branchNames);
        setUpstreamBranch(defaultBranch);
        setUpstreamDefaultBranch(defaultBranch);
        setForkOwnerDraft(defaultOwner);
        setForkOwner(defaultOwner);
        setMetaReadyKey(workspaceKey);
        setForkChecked(true);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载仓库信息失败");
        }
        setFork(null);
        setForkChecked(false);
        setMetaReadyKey(null);
      } finally {
        if (!ac.signal.aborted) setMetaLoading(false);
      }
    }

    void loadMeta();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    ready,
    workspaceKey,
    org,
    repo,
    token,
    username,
    clearSession,
    retryToken,
  ]);

  useEffect(() => {
    if (
      !authReady ||
      !authed ||
      !token ||
      !ready ||
      metaReadyKey !== workspaceKey ||
      !forkChecked
    ) {
      setForkResolving(false);
      setFork(null);
      setForkBranches([]);
      setForkAll([]);
      setForkPage(1);
      return;
    }

    const owner = forkOwner.trim();
    if (!owner) {
      setForkResolving(false);
      setFork(null);
      setForkBranches([]);
      setForkAll([]);
      setForkPage(1);
      return;
    }

    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();

    async function loadForkRepo() {
      setForkResolving(true);
      try {
        const resolved = await resolveForkRepo({
          token: token!,
          upstreamOrg: o,
          upstreamRepo: r,
          forkOwner: owner,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;

        if (!resolved) {
          setFork(null);
          setForkBranches([]);
          setForkAll([]);
          setForkPage(1);
          return;
        }

        const forkInfo: ForkInfo = {
          org: resolved.org,
          repo: resolved.repo,
          full_name: resolved.full_name,
          html_url: resolved.html_url,
          owner_login: resolved.owner_login,
        };
        setFork(forkInfo);

        const forkBranchList = await fetchBranches({
          token: token!,
          org: resolved.org,
          repo: resolved.repo,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;

        const forkNames = forkBranchList.map((b) => b.name);
        setForkBranches(forkNames);
        const forkDefault = forkNames.includes(upstreamDefaultBranch)
          ? upstreamDefaultBranch
          : forkNames[0] || upstreamDefaultBranch;
        setForkBranch(forkDefault);
        setForkPage(1);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载 Fork 仓库失败");
        }
        setFork(null);
        setForkBranches([]);
        setForkAll([]);
        setForkPage(1);
      } finally {
        if (!ac.signal.aborted) setForkResolving(false);
      }
    }

    void loadForkRepo();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    ready,
    workspaceKey,
    org,
    repo,
    token,
    forkOwner,
    forkChecked,
    metaReadyKey,
    upstreamDefaultBranch,
    clearSession,
  ]);

  function confirmForkOwner() {
    setForkOwner(forkOwnerDraft.trim());
    setForkPage(1);
    setPendingScrollSha(null);
  }

  function useMyFork() {
    const mine = username?.trim();
    if (!mine) return;
    setForkOwnerDraft(mine);
    setForkOwner(mine);
    setForkPage(1);
    setPendingScrollSha(null);
  }

  function onUpstreamBranchChange(branch: string) {
    setUpstreamBranch(branch);
    setUpstreamPage(1);
    setPendingScrollSha(null);
  }

  function onForkBranchChange(branch: string) {
    setForkBranch(branch);
    setForkPage(1);
    setPendingScrollSha(null);
  }

  useEffect(() => {
    if (
      !authReady ||
      !authed ||
      !token ||
      !ready ||
      metaReadyKey !== workspaceKey
    ) {
      setUpstreamLoading(false);
      setUpstreamAll([]);
      setUpstreamPage(1);
      return;
    }

    const ac = new AbortController();
    const o = org.trim();
    const r = repo.trim();

    async function loadUpstreamCommits() {
      setUpstreamLoading(true);
      setError(null);
      try {
        const upstream = await fetchAllCommits({
          token: token!,
          org: o,
          repo: r,
          branch: upstreamBranch,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setUpstreamAll(upstream);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载主仓 commit 失败");
        }
        setUpstreamAll([]);
      } finally {
        if (!ac.signal.aborted) setUpstreamLoading(false);
      }
    }

    void loadUpstreamCommits();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    ready,
    workspaceKey,
    org,
    repo,
    token,
    upstreamBranch,
    metaReadyKey,
    clearSession,
  ]);

  useEffect(() => {
    if (
      !authReady ||
      !authed ||
      !token ||
      !ready ||
      metaReadyKey !== workspaceKey
    ) {
      setForkLoading(false);
      setForkAll([]);
      setForkPage(1);
      return;
    }

    if (!fork || !forkBranch || forkResolving) {
      setForkLoading(false);
      if (!fork || forkResolving) setForkAll([]);
      return;
    }

    const ac = new AbortController();

    async function loadForkCommits() {
      setForkLoading(true);
      setError(null);
      try {
        const forkList = await fetchAllCommits({
          token: token!,
          org: fork!.org,
          repo: fork!.repo,
          branch: forkBranch,
          signal: ac.signal,
        });
        if (ac.signal.aborted) return;
        setForkAll(forkList);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载 Fork commit 失败");
        }
        setForkAll([]);
      } finally {
        if (!ac.signal.aborted) setForkLoading(false);
      }
    }

    void loadForkCommits();
    return () => ac.abort();
  }, [
    authReady,
    authed,
    ready,
    workspaceKey,
    token,
    fork,
    forkBranch,
    forkResolving,
    metaReadyKey,
    clearSession,
  ]);

  const fullStats = useMemo(
    () => computeFullDiffStats(upstreamAll, forkAll),
    [upstreamAll, forkAll],
  );
  const lastSharedSha = fullStats.lastSharedSha;

  const forkShaSet = useMemo(() => shaSet(forkAll), [forkAll]);
  const upstreamShaSet = useMemo(() => shaSet(upstreamAll), [upstreamAll]);

  const upstreamPageItems = useMemo(
    () => sliceCommitPage(upstreamAll, upstreamPage, COMMITS_PER_PAGE),
    [upstreamAll, upstreamPage],
  );
  const forkPageItems = useMemo(
    () => sliceCommitPage(forkAll, forkPage, COMMITS_PER_PAGE),
    [forkAll, forkPage],
  );

  const classifiedUpstream = useMemo(
    () => classifyUpstreamCommits(upstreamPageItems, forkShaSet),
    [upstreamPageItems, forkShaSet],
  );
  const classifiedFork = useMemo(
    () => classifyForkCommits(forkPageItems, upstreamShaSet),
    [forkPageItems, upstreamShaSet],
  );

  const upstreamTotalPage = totalPages(upstreamAll.length, COMMITS_PER_PAGE);
  const forkTotalPage = totalPages(forkAll.length, COMMITS_PER_PAGE);

  useEffect(() => {
    if (upstreamPage > upstreamTotalPage) {
      setUpstreamPage(upstreamTotalPage);
    }
  }, [upstreamPage, upstreamTotalPage]);

  useEffect(() => {
    if (forkPage > forkTotalPage) {
      setForkPage(forkTotalPage);
    }
  }, [forkPage, forkTotalPage]);

  useEffect(() => {
    if (!pendingScrollSha) return;
    if (upstreamLoading || forkLoading) return;

    const upIdx = indexOfSha(upstreamAll, pendingScrollSha);
    const fkIdx = indexOfSha(forkAll, pendingScrollSha);
    if (upIdx < 0 && fkIdx < 0) {
      setPendingScrollSha(null);
      return;
    }

    const nextUpPage =
      upIdx >= 0
        ? pageForCommitIndex(upIdx, COMMITS_PER_PAGE)
        : upstreamPage;
    const nextFkPage =
      fkIdx >= 0 ? pageForCommitIndex(fkIdx, COMMITS_PER_PAGE) : forkPage;

    if (nextUpPage !== upstreamPage) setUpstreamPage(nextUpPage);
    if (nextFkPage !== forkPage) setForkPage(nextFkPage);

    if (nextUpPage === upstreamPage && nextFkPage === forkPage) {
      setPendingScrollSha(null);
      setScrollToLastSharedToken((t) => t + 1);
    }
  }, [
    pendingScrollSha,
    upstreamAll,
    forkAll,
    upstreamLoading,
    forkLoading,
    upstreamPage,
    forkPage,
  ]);

  function scrollToLastShared() {
    if (lastSharedSha) {
      setPendingScrollSha(lastSharedSha);
    }
  }

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

  const statsReady =
    !upstreamLoading && (!fork || !forkLoading) && !forkResolving;

  return (
    <div className={styles.root}>
      <div className={styles.topLeft}>
        <RepoConfirmBar disabled={metaLoading} />
      </div>
      <div className={styles.topRight}>
        <ForkStatusCard
          loading={metaLoading || forkResolving}
          checked={forkChecked && ready}
          forkOwnerDraft={forkOwnerDraft}
          onForkOwnerDraftChange={setForkOwnerDraft}
          onConfirmForkOwner={confirmForkOwner}
          disabled={metaLoading}
        />
      </div>

      {!ready ? (
        <div className={styles.bottomFull}>
          <EmptyState>请填写组织和仓库并确认</EmptyState>
        </div>
      ) : (
        <>
          {error ? (
            <div className={styles.bannerRow}>
              <ErrorBanner
                message={error}
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setMetaReadyKey(null);
                      setRetryToken((t) => t + 1);
                    }}
                  >
                    重试
                  </Button>
                }
              />
            </div>
          ) : null}

          <div className={styles.legend}>
            <div className={styles.legendMain}>
              {statsReady ? (
                <>
                  <span>主仓 {fullStats.upstreamTotal} 个</span>
                  <span className={styles.legendSep}>·</span>
                  <span>Fork {fullStats.forkTotal} 个</span>
                  {fork ? (
                    <>
                      <span className={styles.legendSep}>·</span>
                      <span className={styles.legendFork}>
                        Fork 领先 {fullStats.forkAhead}
                      </span>
                      <span className={styles.legendSep}>·</span>
                      <span className={styles.legendUpstream}>
                        落后 {fullStats.forkBehind}
                      </span>
                    </>
                  ) : null}
                  {lastSharedSha ? (
                    <>
                      <span className={styles.legendSep}>·</span>
                      <button
                        type="button"
                        className={styles.lastSharedBtn}
                        onClick={scrollToLastShared}
                      >
                        最后共有 {lastSharedSha.slice(0, 8)}
                      </button>
                    </>
                  ) : statsReady && fork ? (
                    <>
                      <span className={styles.legendSep}>·</span>
                      <span className={styles.legendMeta}>无共有 commit</span>
                    </>
                  ) : null}
                </>
              ) : (
                <span className={styles.legendMeta}>统计加载中…</span>
              )}
            </div>
            <div className={styles.legendSide}>
              {!forkChecked ? null : forkResolving || metaLoading ? (
                <span className={styles.legendMeta}>查找 Fork…</span>
              ) : fork ? (
                <>
                  <span
                    className={`${styles.forkBadge} ${
                      username &&
                      forkOwner.trim().toLowerCase() ===
                        username.trim().toLowerCase()
                        ? styles.forkBadgeOwn
                        : ""
                    }`}
                  >
                    {username &&
                    forkOwner.trim().toLowerCase() ===
                      username.trim().toLowerCase()
                      ? "我的 Fork"
                      : "公开 Fork"}
                  </span>
                  <a
                    className={styles.forkLink}
                    href={fork.html_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {fork.full_name}
                  </a>
                </>
              ) : forkOwner.trim() ? (
                <span className={styles.legendMeta}>
                  未找到 {forkOwner.trim()} 的 Fork
                </span>
              ) : null}
              {username && forkChecked && !forkResolving && !metaLoading ? (
                <button
                  type="button"
                  className={styles.useMineBtn}
                  disabled={forkOwner === username}
                  onClick={useMyFork}
                >
                  我的账号
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.commitsRow}>
            <div className={styles.bottomLeft}>
              <CommitPanel
                title="主仓 Commits"
                branch={upstreamBranch}
                branches={upstreamBranches}
                items={classifiedUpstream}
                loading={upstreamLoading}
                disabled={!ready}
                lastSharedSha={lastSharedSha}
                scrollToLastSharedToken={scrollToLastSharedToken}
                page={upstreamPage}
                totalPage={upstreamTotalPage}
                totalCount={upstreamAll.length}
                onPageChange={setUpstreamPage}
                onBranchChange={onUpstreamBranchChange}
              />
            </div>
            <div className={styles.bottomRight}>
              <CommitPanel
                title={
                  fork
                    ? `Fork Commits · ${fork.owner_login}`
                    : "Fork Commits"
                }
                branch={forkBranch}
                branches={fork ? forkBranches : []}
                items={classifiedFork}
                loading={forkLoading || forkResolving}
                disabled={!ready || !fork}
                emptyHint={
                  fork
                    ? "暂无 commit"
                    : forkOwner.trim()
                      ? "未找到可用 Fork"
                      : "请输入 Fork 用户并确认"
                }
                lastSharedSha={lastSharedSha}
                scrollToLastSharedToken={scrollToLastSharedToken}
                page={forkPage}
                totalPage={forkTotalPage}
                totalCount={forkAll.length}
                onPageChange={setForkPage}
                onBranchChange={onForkBranchChange}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
