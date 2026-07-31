"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { TextInput } from "@/components/ui/TextInput";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Issue, IssueComment, RelatedPull } from "@/lib/issues/types";
import {
  buildIssueUrl,
  buildPullUrl,
  canNavigate,
  neighbor,
  parseJumpNumber,
} from "@/lib/issues/detailNav";
import styles from "./IssueDetailPanel.module.css";

type IssueDetailPanelProps = {
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

function pullHref(pull: RelatedPull, org: string, repo: string): string {
  if (pull.html_url) return pull.html_url;
  return buildPullUrl(org, repo, pull.number);
}

export function IssueDetailPanel({
  org,
  repo,
  numbers,
  selectedNumber,
  onSelect,
}: IssueDetailPanelProps) {
  const { token, clearSession } = useAuth();
  const [jumpRaw, setJumpRaw] = useState("");
  const [detail, setDetail] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [relatedPulls, setRelatedPulls] = useState<RelatedPull[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = canNavigate(numbers, selectedNumber);

  const externalUrl =
    selectedNumber != null && org && repo
      ? buildIssueUrl(org, repo, selectedNumber)
      : null;

  useEffect(() => {
    if (selectedNumber == null || !org || !repo || !token) {
      setDetail(null);
      setComments([]);
      setRelatedPulls([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          org,
          repo,
          number: String(selectedNumber),
        });
        const res = await fetch(`/api/issues/detail?${params}`, {
          signal: ac.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          clearSession();
          throw new Error("Token 无效，请重新配置");
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(body?.message || `加载详情失败（${res.status}）`);
        }
        const data = (await res.json()) as {
          issue: Issue;
          comments?: IssueComment[];
          related_pulls?: RelatedPull[];
        };
        setDetail(data.issue);
        setComments(data.comments ?? []);
        setRelatedPulls(data.related_pulls ?? []);
      } catch (err) {
        if (ac.signal.aborted) return;
        setDetail(null);
        setComments([]);
        setRelatedPulls([]);
        setError(err instanceof Error ? err.message : "加载详情失败");
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
              aria-label="跳转到 Issue 编号"
            />
          </div>
          <Button variant="primary" onClick={jump}>
            Go
          </Button>
        </div>
      </div>

      <div className={styles.frameWrap}>
        {selectedNumber == null ? (
          <EmptyState>选择左侧 Issue，或输入编号跳转查看详情</EmptyState>
        ) : loading ? (
          <EmptyState>加载详情中…</EmptyState>
        ) : error ? (
          <EmptyState>{error}</EmptyState>
        ) : detail ? (
          <div className={styles.detail}>
            <div className={styles.detailHeader}>
              {externalUrl ? (
                <a
                  className={styles.detailTitleLink}
                  href={externalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={styles.detailNumber}>#{detail.number}</span>
                  {detail.title}
                </a>
              ) : (
                <h2 className={styles.detailTitle}>
                  <span className={styles.detailNumber}>#{detail.number}</span>
                  {detail.title}
                </h2>
              )}
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
                  <dt>类型</dt>
                  <dd>{detail.issue_type || "—"}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{formatTime(detail.created_at)}</dd>
                </div>
                <div>
                  <dt>更新时间</dt>
                  <dd>{formatTime(detail.updated_at)}</dd>
                </div>
                <div className={styles.infoFull}>
                  <dt>关联 PR</dt>
                  <dd>
                    {relatedPulls.length === 0 ? (
                      "—"
                    ) : (
                      <ul className={styles.relatedPullList}>
                        {relatedPulls.map((p) => (
                          <li key={p.number}>
                            <a
                              className={styles.relatedPullLink}
                              href={pullHref(p, org, repo)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <span className={styles.relatedPullNum}>
                                #{p.number}
                              </span>
                              <span className={styles.relatedPullTitle}>
                                {p.title}
                              </span>
                              <span className={styles.relatedPullState}>
                                {p.state}
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
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
