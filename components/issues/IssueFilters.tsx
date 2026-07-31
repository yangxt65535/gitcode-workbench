"use client";

import { MultiSelect } from "@/components/ui/MultiSelect";
import type { IssueMeta } from "@/lib/issues/types";
import styles from "./IssueFilters.module.css";

export type IssueFiltersValue = {
  state: string[];
  creator: string[];
  assignee: string[];
  label: string[];
  milestone: string[];
  type: string[];
  sort: "created" | "updated";
  direction: "asc" | "desc";
};

export const DEFAULT_ISSUE_FILTERS: IssueFiltersValue = {
  state: [],
  creator: [],
  assignee: [],
  label: [],
  milestone: [],
  type: [],
  sort: "updated",
  direction: "desc",
};

type IssueFiltersProps = {
  meta: IssueMeta | null;
  value: IssueFiltersValue;
  onChange: (next: IssueFiltersValue) => void;
  disabled?: boolean;
};

export function IssueFilters({
  meta,
  value,
  onChange,
  disabled,
}: IssueFiltersProps) {
  function patch(partial: Partial<IssueFiltersValue>) {
    onChange({ ...value, ...partial });
  }

  const empty: string[] = [];

  return (
    <div className={styles.root} aria-disabled={disabled || undefined}>
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
          label="负责人"
          options={meta?.assignees ?? empty}
          value={value.assignee}
          onChange={(assignee) => patch({ assignee })}
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
        <MultiSelect
          label="类型"
          options={meta?.types ?? empty}
          value={value.type}
          onChange={(type) => patch({ type })}
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
            <option value="updated">更新时间</option>
            <option value="created">创建时间</option>
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
