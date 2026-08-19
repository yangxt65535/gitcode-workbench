"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TextInput } from "@/components/ui/TextInput";
import type { PullMeta } from "@/lib/pulls/types";
import styles from "@/components/workbench/Filters.module.css";

export type PullFiltersValue = {
  state: string[];
  creator: string[];
  base: string[];
  label: string[];
  milestone: string[];
  search: string;
  sort: "created" | "updated";
  direction: "asc" | "desc";
};

export const DEFAULT_PULL_FILTERS: PullFiltersValue = {
  state: ["open"],
  creator: [],
  base: [],
  label: [],
  milestone: [],
  search: "",
  sort: "created",
  direction: "desc",
};

type PullFiltersProps = {
  meta: PullMeta | null;
  value: PullFiltersValue;
  onChange: (next: PullFiltersValue) => void;
  disabled?: boolean;
};

export function PullFilters({
  meta,
  value,
  onChange,
  disabled,
}: PullFiltersProps) {
  const [searchDraft, setSearchDraft] = useState(value.search);

  useEffect(() => {
    setSearchDraft(value.search);
  }, [value.search]);

  function patch(partial: Partial<PullFiltersValue>) {
    onChange({ ...value, ...partial });
  }

  function applySearch() {
    const next = searchDraft.trim();
    if (next === value.search) return;
    patch({ search: next });
  }

  function clearSearch() {
    setSearchDraft("");
    if (value.search) {
      patch({ search: "" });
    }
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") applySearch();
  }

  const empty: string[] = [];
  const canClearSearch = Boolean(searchDraft.trim() || value.search);

  return (
    <div className={styles.root} aria-disabled={disabled || undefined}>
      <div className={styles.searchRow}>
        <label className={styles.searchField}>
          <span className={styles.sortLabel}>标题搜索</span>
          <div className={styles.searchControls}>
            <div className={styles.searchInput}>
              <TextInput
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="按标题关键字搜索"
                disabled={disabled}
                aria-label="标题搜索"
              />
            </div>
            <Button
              variant="secondary"
              disabled={disabled || !canClearSearch}
              onClick={clearSearch}
            >
              清空
            </Button>
            <Button
              variant="primary"
              disabled={disabled}
              onClick={applySearch}
            >
              确认
            </Button>
          </div>
        </label>
      </div>
      <div className={styles.multiRow}>
        <MultiSelect
          label="状态"
          options={meta?.states ?? empty}
          value={value.state}
          onChange={(state) => patch({ state })}
          disabled={disabled}
        />
        <MultiSelect
          label="创建者"
          options={meta?.creators ?? empty}
          value={value.creator}
          onChange={(creator) => patch({ creator })}
          disabled={disabled}
        />
        <MultiSelect
          label="目标分支"
          options={meta?.baseBranches ?? empty}
          value={value.base}
          onChange={(base) => patch({ base })}
          disabled={disabled}
        />
        <MultiSelect
          label="Label"
          options={meta?.labels ?? empty}
          value={value.label}
          onChange={(label) => patch({ label })}
          disabled={disabled}
        />
        <MultiSelect
          label="里程碑"
          options={meta?.milestones ?? empty}
          value={value.milestone}
          onChange={(milestone) => patch({ milestone })}
          disabled={disabled}
        />
      </div>
      <div className={styles.sortRow}>
        <label className={styles.sortField}>
          <span className={styles.sortLabel}>排序字段</span>
          <select
            className={styles.select}
            value={value.sort}
            disabled={disabled}
            onChange={(e) =>
              patch({ sort: e.target.value as "created" | "updated" })
            }
          >
            <option value="created">创建时间</option>
            <option value="updated">更新时间</option>
          </select>
        </label>
        <label className={styles.sortField}>
          <span className={styles.sortLabel}>方向</span>
          <select
            className={styles.select}
            value={value.direction}
            disabled={disabled}
            onChange={(e) =>
              patch({ direction: e.target.value as "asc" | "desc" })
            }
          >
            <option value="desc">倒序</option>
            <option value="asc">正序</option>
          </select>
        </label>
      </div>
    </div>
  );
}
