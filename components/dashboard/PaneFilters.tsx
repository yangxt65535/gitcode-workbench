"use client";

import { MultiSelect } from "@/components/ui/MultiSelect";
import type {
  DashboardPaneFilters,
  IssueInvolvement,
} from "@/lib/dashboard/types";
import styles from "./PaneFilters.module.css";

type PaneFiltersProps = {
  side: "issue" | "pull";
  value: DashboardPaneFilters;
  labelOptions: string[];
  onChange: (next: DashboardPaneFilters) => void;
  disabled?: boolean;
};

const ISSUE_STATES = ["open", "closed"];
const PULL_STATES = ["open", "closed", "merged"];

export function PaneFilters({
  side,
  value,
  labelOptions,
  onChange,
  disabled,
}: PaneFiltersProps) {
  function patch(partial: Partial<DashboardPaneFilters>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className={styles.root}>
      {side === "issue" ? (
        <div className={styles.field}>
          <span className={styles.label}>范围</span>
          <select
            className={styles.select}
            value={value.involvement ?? "all"}
            disabled={disabled}
            onChange={(e) =>
              patch({
                involvement: e.target.value as IssueInvolvement,
              })
            }
            aria-label="Issue 范围"
          >
            <option value="all">创建+负责</option>
            <option value="created">我创建的</option>
            <option value="assigned">我负责的</option>
          </select>
        </div>
      ) : null}
      <div className={styles.field}>
        <MultiSelect
          label="状态"
          options={side === "issue" ? ISSUE_STATES : PULL_STATES}
          value={value.state}
          onChange={(state) => patch({ state })}
          disabled={disabled}
        />
      </div>
      <div className={styles.field}>
        <MultiSelect
          label="标签"
          options={labelOptions}
          value={value.label}
          onChange={(label) => patch({ label })}
          disabled={disabled}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label}>排序</span>
        <select
          className={styles.select}
          value={value.sort}
          disabled={disabled}
          onChange={(e) =>
            patch({ sort: e.target.value as DashboardPaneFilters["sort"] })
          }
          aria-label="排序字段"
        >
          <option value="updated">更新时间</option>
          <option value="created">创建时间</option>
        </select>
      </div>
      <div className={styles.field}>
        <span className={styles.label}>方向</span>
        <select
          className={styles.select}
          value={value.direction}
          disabled={disabled}
          onChange={(e) =>
            patch({
              direction: e.target.value as DashboardPaneFilters["direction"],
            })
          }
          aria-label="排序方向"
        >
          <option value="desc">降序</option>
          <option value="asc">升序</option>
        </select>
      </div>
    </div>
  );
}
