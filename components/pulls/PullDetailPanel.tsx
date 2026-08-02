"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { TextInput } from "@/components/ui/TextInput";
import { useAuth } from "@/lib/auth/AuthContext";
import { GitCodeHttpError } from "@/lib/gitcode/client";
import { fetchPullDetail } from "@/lib/gitcode/fetchPullDetail";
import {
  buildPullUrl,
  canNavigate,
  neighbor,
  parseJumpNumber,
} from "@/lib/issues/detailNav";
import type { Pull, PullComment } from "@/lib/pulls/types";
import styles from "./PullDetailPanel.module.css";

type PullDetailPanelProps = {
  org: string;
  repo: string;
  numbers: number[];
  selectedNumber: number | null;
  onSelect: (number: number) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pullHref(pull: Pull, org: string, repo: string): string {
  if (pull.html_url) return pull.html_url;
  return buildPullUrl(org, repo, pull.number);
}

export function PullDetailPanel({
  org,
  repo,
  numbers,
  selectedNumber,
  onSelect,
}: PullDetailPanelProps) {
  const { token, clearSession } = useAuth();
  const [jumpRaw, setJumpRaw] = useState(
    selectedNumber != null ? String(selectedNumber) : "",
  );
  const [detail, setDetail] = useState<Pull | null>(null);
  const [comments, setComments] = useState<PullComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = canNavigate(numbers, selectedNumber);

  useEffect(() => {
    setJumpRaw(selectedNumber != null ? String(selectedNumber) : "");
  }, [selectedNumber]);

  useEffect(() => {
    if (selectedNumber == null || !org || !repo || !token) {
      setDetail(null);
      setComments([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPullDetail({
          token: token!,
          org,
          repo,
          number: selectedNumber!,
          signal: ac.signal,
        });
        setDetail(data.pull);
        setComments(data.comments);
      } catch (err) {
        if (ac.signal.aborted) return;
        if (err instanceof GitCodeHttpError && err.status === 401) {
          clearSession();
          setError("Token 无效，请重新配置");
        } else {
          setError(err instanceof Error ? err.message : "加载详情失败");
        }
        setDetail(null);
        setComments([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }
    void run();
    return () => ac.abort();
  }, [selectedNumber, org, repo, token, clearSession]);

  function goPrev() {
    const n = neighbor(numbers, selectedNumber, -1);
    if (n != null) onSelect(n);
  }

  function goNext() {
    const n = neighbor(numbers, selectedNumber, 1);
    if (n != null) onSelect(n);
  }

  function jump() {
    const n = parseJumpNumber(jumpRaw);
    if (n == null) return;
    onSelect(n);
  }

  function onJumpKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") jump();
  }

  const mergedLabel = detail?.merged_at ? "是" : "否";

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.navBtns}>
          <Button variant="secondary" disabled={!nav.prev} onClick={goPrev}>
            上一个
          </Button>
          <Button variant="secondary" disabled={!nav.next} onClick={goNext}>
            下一个
          </Button>
        </div>
        <div className={styles.jump}>
          <span className={styles.jumpHash}>#</span>
          <div className={styles.jumpInput}>
            <TextInput
              value={jumpRaw}
              onChange={(e) => setJumpRaw(e.target.value)}
              onKeyDown={onJumpKeyDown}
              placeholder="编号"
              aria-label="跳转到 PR 编号"
            />
          </div>
          <Button variant="primary" onClick={jump}>
            Go
          </Button>
        </div>
      </div>

      <div className={styles.frameWrap}>
        {selectedNumber == null ? (
          <EmptyState>选择左侧 PR，或输入编号跳转查看详情</EmptyState>
        ) : loading ? (
          <EmptyState>加载详情中…</EmptyState>
        ) : error ? (
          <EmptyState>{error}</EmptyState>
        ) : detail ? (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              <a
                className={styles.detailTitleLink}
                href={pullHref(detail, org, repo)}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.detailNumber}>#{detail.number}</span>
                {detail.title}
              </a>
            </div>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>基本信息</h3>
              <dl className={styles.infoGrid}>
                <div>
                  <dt>状态</dt>
                  <dd>{detail.state}</dd>
                </div>
                <div>
                  <dt>创建者</dt>
                  <dd>{detail.user.login}</dd>
                </div>
                <div>
                  <dt>负责人</dt>
                  <dd>
                    {detail.assignees.length > 0
                      ? detail.assignees.map((a) => a.login).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>测试人</dt>
                  <dd>
                    {detail.testers.length > 0
                      ? detail.testers.map((t) => t.login).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>标签</dt>
                  <dd>
                    {detail.labels.length > 0
                      ? detail.labels.map((l) => l.name).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt>里程碑</dt>
                  <dd>{detail.milestone || "—"}</dd>
                </div>
                <div>
                  <dt>源分支</dt>
                  <dd>{detail.head_ref || "—"}</dd>
                </div>
                <div>
                  <dt>目标分支</dt>
                  <dd>{detail.base_ref || "—"}</dd>
                </div>
                <div>
                  <dt>Draft</dt>
                  <dd>{detail.draft ? "是" : "否"}</dd>
                </div>
                <div>
                  <dt>已合并</dt>
                  <dd>{mergedLabel}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{formatTime(detail.created_at)}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{formatTime(detail.updated_at)}</dd>
                </div>
                {detail.merged_at ? (
                  <div>
                    <dt>合并时间</dt>
                    <dd>{formatTime(detail.merged_at)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>正文</h3>
              <MarkdownContent
                content={detail.body ?? ""}
                emptyFallback="（无正文）"
              />
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                评论{comments.length > 0 ? `（${comments.length}）` : ""}
              </h3>
              {comments.length === 0 ? (
                <p className={styles.emptyComments}>暂无评论</p>
              ) : (
                <ul className={styles.commentList}>
                  {comments.map((c) => (
                    <li key={String(c.id)} className={styles.comment}>
                      <div className={styles.commentMeta}>
                        <strong>{c.user.login}</strong>
                        <span>{formatTime(c.created_at)}</span>
                      </div>
                      <MarkdownContent
                        className={styles.commentBody}
                        content={c.body}
                        emptyFallback="（空评论）"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <EmptyState>暂无详情</EmptyState>
        )}
      </div>
    </div>
  );
}
