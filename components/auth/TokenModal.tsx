"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextInput } from "@/components/ui/TextInput";
import { useAuth } from "@/lib/auth/AuthContext";
import styles from "./TokenModal.module.css";

type TokenModalProps = {
  open: boolean;
  onClose: () => void;
};

export function TokenModal({ open, onClose }: TokenModalProps) {
  const { username, setSession, clearSession } = useAuth();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const configured = Boolean(username);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("请输入 Token");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });
      const body = (await res.json().catch(() => null)) as {
        username?: string;
        message?: string;
      } | null;
      if (!res.ok || !body?.username) {
        throw new Error(body?.message || "Token 无效或权限不足");
      }
      setSession({ token: trimmed, username: body.username });
      setToken("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "配置失败");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClear() {
    clearSession();
    setToken("");
    setError(null);
    onClose();
  }

  function handleClose() {
    setToken("");
    setError(null);
    onClose();
  }

  return (
    <Modal open={open} title="配置 GitCode Token" onClose={handleClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <p className={styles.hint}>
          使用 Personal Access Token。确认后将校验并仅保存在本机浏览器。
        </p>
        <TextInput
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={configured ? "输入新 Token 以更换" : "粘贴 GitCode Token"}
          type="password"
          autoComplete="off"
          aria-label="GitCode Token"
        />
        {error ? <p className={styles.error}>{error}</p> : null}
        <div className={styles.actions}>
          {configured ? (
            <Button type="button" variant="ghost" onClick={handleClear} disabled={submitting}>
              清除 Token
            </Button>
          ) : (
            <span />
          )}
          <div className={styles.rightActions}>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "校验中…" : "确认"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
