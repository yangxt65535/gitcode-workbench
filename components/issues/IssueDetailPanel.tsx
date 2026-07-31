"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextInput } from "@/components/ui/TextInput";
import {
  buildIssueUrl,
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

export function IssueDetailPanel({
  org,
  repo,
  numbers,
  selectedNumber,
  onSelect,
}: IssueDetailPanelProps) {
  const [jumpRaw, setJumpRaw] = useState("");
  const nav = canNavigate(numbers, selectedNumber);

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

  const src =
    selectedNumber != null && org && repo
      ? buildIssueUrl(org, repo, selectedNumber)
      : undefined;

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
        {src ? (
          <iframe
            className={styles.iframe}
            title={`Issue #${selectedNumber}`}
            src={src}
          />
        ) : (
          <EmptyState>选择左侧 Issue，或输入编号跳转查看详情</EmptyState>
        )}
      </div>

      {src ? (
        <p className={styles.hint}>
          若详情空白，请在浏览器登录 GitCode 并确认具备该仓库权限。
        </p>
      ) : null}
    </div>
  );
}
