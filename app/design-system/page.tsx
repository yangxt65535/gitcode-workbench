"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./design-system.module.css";

const TOKENS = [
  { name: "--bg", value: "#F7F8FA" },
  { name: "--surface", value: "#FFFFFF" },
  { name: "--border", value: "#E5E7EB" },
  { name: "--text", value: "#111827" },
  { name: "--text-secondary", value: "#6B7280" },
  { name: "--text-muted", value: "#9CA3AF" },
  { name: "--accent", value: "#2563EB" },
  { name: "--accent-subtle", value: "#EFF6FF" },
  { name: "--danger", value: "#DC2626" },
  { name: "--success", value: "#059669" },
] as const;

const MULTI_OPTIONS = ["open", "closed", "bug", "feature", "docs"];

export default function DesignSystemPage() {
  const [inputValue, setInputValue] = useState("");
  const [selected, setSelected] = useState<string[]>(["open"]);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>设计规范样例</h1>
      <p className={styles.subtitle}>
        简约中性 + 单一强调色；小圆角；少量反馈动画（120–180ms）。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. 色板</h2>
        <div className={styles.swatches}>
          {TOKENS.map((token) => (
            <div key={token.name} className={styles.swatch}>
              <div
                className={styles.swatchColor}
                style={{ background: `var(${token.name})` }}
                title={token.value}
              />
              <div className={styles.swatchName}>{token.name}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. 按钮</h2>
        <div className={styles.rowGroup}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. 输入框</h2>
        <div style={{ maxWidth: 280 }}>
          <TextInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="点击聚焦查看 focus 环"
          />
        </div>
        <p className={styles.hint}>
          focus：accent 细环（outline 2px color-mix）+ 边框强调，圆角 var(--radius-md)。
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. MultiSelect</h2>
        <div style={{ maxWidth: 220 }}>
          <MultiSelect
            label="状态 / 标签"
            options={MULTI_OPTIONS}
            value={selected}
            onChange={setSelected}
          />
        </div>
        <p className={styles.hint}>当前选择：{selected.join(", ") || "（空）"}</p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. 列表行</h2>
        <div className={styles.listDemo}>
          <div className="row">默认行 — 悬停查看浅底</div>
          <div className="row">另一行默认态</div>
          <div className="row rowSelected">选中行 — accent-subtle + 左侧 2px 条</div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. EmptyState / ErrorBanner</h2>
        <div className={styles.stack}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
            }}
          >
            <EmptyState>暂无数据，请先填写 org / repo</EmptyState>
          </div>
          <ErrorBanner
            message="加载失败：无法获取 Issue 列表"
            action={
              <Button variant="secondary" onClick={() => undefined}>
                重试
              </Button>
            }
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. 左右分栏示意</h2>
        <div className={styles.split}>
          <div className={styles.splitLeft}>左栏 36% — 列表 / 筛选</div>
          <div className={styles.splitRight}>右栏 64% — 详情面板</div>
        </div>
      </section>
    </div>
  );
}
