"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownContent.module.css";

type MarkdownContentProps = {
  content: string;
  className?: string;
  emptyFallback?: string;
};

export function MarkdownContent({
  content,
  className,
  emptyFallback = "（无内容）",
}: MarkdownContentProps) {
  const text = content.trim();
  if (!text) {
    return (
      <div className={[styles.root, className].filter(Boolean).join(" ")}>
        <p className={styles.empty}>{emptyFallback}</p>
      </div>
    );
  }

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
