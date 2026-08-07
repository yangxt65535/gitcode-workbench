# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `/dashboard` 左右对半看板：组织内「我创建的」Issues / PRs，共用仓库筛选，独立状态/标签/排序，选中关联高亮，PR 行内刷新元数据。

**Architecture:** 新模块 `dashboard`（不改 Issues/Pulls Workbench）。Issue 走 `GET /orgs/{org}/issues?filter=created`；PR 按仓聚合 `pulls?author=`；关联与单 PR 刷新走现有 GitCode 详情类端点。所有请求经 `fetchGitCode()`。

**Tech Stack:** Next.js 15 静态导出 SPA、React 19、TypeScript、CSS Modules、Vitest

## Global Constraints

- 纯静态 SPA：`output: "export"`；禁止 API Route / Server Action / SSR 数据获取
- 浏览器直连 GitCode：一律 `lib/gitcode/client.ts` 的 `fetchGitCode()`
- Token / username 来自 `useAuth()`；401 → `clearSession()`
- 仅 creator：Issue `filter=created`；PR `author={username}`
- 仓库筛选顶栏共用；无两侧独立仓、无一键同步
- 点击无详情页；关联不可见静默忽略
- Spec：`docs/superpowers/specs/2026-08-08-gitcode-dashboard-design.md`
- 中文 UI；PowerShell 用 `;` 不用 `&&`
- 改完跑 `npm test` 与 `npm run build`

---

## File Structure

```
app/dashboard/page.tsx
app/dashboard/page.module.css          # 可复用 issues page 样式或自建
components/shell/ModuleNav.tsx         # 增加 Dashboard 链接
components/dashboard/
  DashboardWorkbench.tsx
  DashboardWorkbench.module.css
  OrgConfirmBar.tsx                    # 只确认 org（保留 workspace.repo 不动）
  OrgConfirmBar.module.css
  DashboardRepoFilter.tsx              # 全部 / 多选仓
  PaneFilters.tsx
  PaneFilters.module.css
  IssuePane.tsx
  PullPane.tsx
  DashboardListItem.tsx
  DashboardListItem.module.css
lib/dashboard/
  types.ts
  itemKey.ts
  queryLogic.ts
  relatedKeys.ts
  mergePullMeta.ts
lib/gitcode/
  fetchOrgRepos.ts
  fetchOrgUserIssues.ts
  fetchOrgUserPulls.ts
  fetchIssueRelatedPulls.ts
  fetchPullRelatedIssues.ts
  refreshPullMeta.ts
  mapDashboardIssue.ts                 # Issue + org/repo（从 repository.path）
tests/dashboard/
  queryLogic.test.ts
  itemKey.test.ts
  relatedKeys.test.ts
  mergePullMeta.test.ts
AGENTS.md                              # 补充 Dashboard 模块说明
```

**Workspace：** 扩展 `commitOrg(org: string)`：`commitRepo({ org, repo: 当前 repo })`，避免清空 Issues/Pulls 当前仓。

**硬上限（实现常量）：**
- `MAX_ORG_REPOS = 100`（扫描仓数）
- `PULL_FETCH_CONCURRENCY = 5`
- `MAX_ISSUES_PAGES = 20`（org issues 最多拉 20 页 × 100）
- `MAX_PULL_PAGES_PER_REPO = 10`
- `PAGE_SIZE = 20`

---

### Task 1: 领域类型、itemKey、queryLogic

**Files:**
- Create: `lib/dashboard/types.ts`
- Create: `lib/dashboard/itemKey.ts`
- Create: `lib/dashboard/queryLogic.ts`
- Create: `tests/dashboard/itemKey.test.ts`
- Create: `tests/dashboard/queryLogic.test.ts`

**Interfaces:**
- Produces:
  - `DashboardIssue` / `DashboardPull`（含 `org`、`repo`）
  - `DashboardPaneFilters`、`DEFAULT_PANE_FILTERS`
  - `itemKey(repo: string, number: number): string` → `` `${repo}#${number}` ``
  - `parseItemKey(key: string): { repo: string; number: number } | null`
  - `filterDashboardItems<T extends { state: string; labels: {name:string}[]; repo: string; created_at: string; updated_at: string }>(items, filters, selectedRepos: string[] | "all")`
  - `sortDashboardItems(items, sort, direction)`
  - `slicePage(items, page, perPage)`
  - `collectLabels(items): string[]`

- [ ] **Step 1: 写失败单测**

`tests/dashboard/itemKey.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { itemKey, parseItemKey } from "@/lib/dashboard/itemKey";

describe("itemKey", () => {
  it("round-trips repo and number", () => {
    expect(itemKey("e2e-auto-test", 12)).toBe("e2e-auto-test#12");
    expect(parseItemKey("e2e-auto-test#12")).toEqual({
      repo: "e2e-auto-test",
      number: 12,
    });
  });

  it("returns null for invalid keys", () => {
    expect(parseItemKey("")).toBeNull();
    expect(parseItemKey("nohash")).toBeNull();
    expect(parseItemKey("repo#0")).toBeNull();
  });
});
```

`tests/dashboard/queryLogic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  filterDashboardItems,
  sortDashboardItems,
  slicePage,
  collectLabels,
  DEFAULT_PANE_FILTERS,
} from "@/lib/dashboard/queryLogic";

const base = {
  org: "openFuyao",
  state: "open",
  labels: [{ name: "bug" }],
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

const items = [
  { ...base, number: 1, title: "a", repo: "r1", html_url: "", user: { login: "u" } },
  {
    ...base,
    number: 2,
    title: "b",
    repo: "r2",
    state: "closed",
    labels: [{ name: "docs" }],
    updated_at: "2026-03-01T00:00:00Z",
    html_url: "",
    user: { login: "u" },
  },
];

describe("queryLogic", () => {
  it("filters by selected repos", () => {
    const out = filterDashboardItems(items, DEFAULT_PANE_FILTERS, ["r1"]);
    expect(out.map((i) => i.number)).toEqual([1]);
  });

  it("filters by state and label", () => {
    const out = filterDashboardItems(
      items,
      { ...DEFAULT_PANE_FILTERS, state: ["closed"], label: ["docs"] },
      "all",
    );
    expect(out.map((i) => i.number)).toEqual([2]);
  });

  it("sorts by updated desc and slices page", () => {
    const sorted = sortDashboardItems(items, "updated", "desc");
    expect(sorted[0].number).toBe(2);
    expect(slicePage(sorted, 1, 1).map((i) => i.number)).toEqual([2]);
  });

  it("collects unique labels", () => {
    expect(collectLabels(items)).toEqual(["bug", "docs"]);
  });
});
```

- [ ] **Step 2: 跑测确认失败**

Run: `npm test -- --run tests/dashboard/itemKey.test.ts tests/dashboard/queryLogic.test.ts`  
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现**

`lib/dashboard/types.ts`:

```ts
export type DashboardIssue = {
  org: string;
  repo: string;
  number: number;
  title: string;
  state: string;
  labels: { name: string; color?: string }[];
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
};

export type DashboardPull = DashboardIssue & {
  draft?: boolean;
  merged_at?: string | null;
};

export type DashboardPaneFilters = {
  state: string[];
  label: string[];
  sort: "created" | "updated";
  direction: "asc" | "desc";
};

export type DashboardSelection = {
  side: "issue" | "pull";
  repo: string;
  number: number;
};

export const DEFAULT_PANE_FILTERS: DashboardPaneFilters = {
  state: ["open"],
  label: [],
  sort: "updated",
  direction: "desc",
};

export const PAGE_SIZE = 20;
export const MAX_ORG_REPOS = 100;
export const PULL_FETCH_CONCURRENCY = 5;
export const MAX_ISSUES_PAGES = 20;
export const MAX_PULL_PAGES_PER_REPO = 10;
```

`lib/dashboard/itemKey.ts`:

```ts
export function itemKey(repo: string, number: number): string {
  return `${repo.trim()}#${number}`;
}

export function parseItemKey(
  key: string,
): { repo: string; number: number } | null {
  const i = key.lastIndexOf("#");
  if (i <= 0) return null;
  const repo = key.slice(0, i).trim();
  const n = Number(key.slice(i + 1));
  if (!repo || !Number.isInteger(n) || n < 1) return null;
  return { repo, number: n };
}
```

`lib/dashboard/queryLogic.ts`：实现 `activeFilter`、`filterDashboardItems`（repos `"all"` 或 `includes(repo)`；state/label 多选 OR）、`sortDashboardItems`、`slicePage`、`collectLabels`（复用 issues 的 `uniqueSorted` 思路）。从 `types` re-export `DEFAULT_PANE_FILTERS` 或在 queryLogic 再导出以便测试 import 一处——**测试从 `queryLogic` 导入 `DEFAULT_PANE_FILTERS` 时，在 queryLogic 里 `export { DEFAULT_PANE_FILTERS } from "./types"`**。

- [ ] **Step 4: 跑测通过**

Run: `npm test -- --run tests/dashboard/itemKey.test.ts tests/dashboard/queryLogic.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard tests/dashboard
git commit -m "feat(dashboard): add types, itemKey, and queryLogic"
```

---

### Task 2: relatedKeys + mergePullMeta

**Files:**
- Create: `lib/dashboard/relatedKeys.ts`
- Create: `lib/dashboard/mergePullMeta.ts`
- Create: `tests/dashboard/relatedKeys.test.ts`
- Create: `tests/dashboard/mergePullMeta.test.ts`

**Interfaces:**
- Produces:
  - `relatedKeysFromLinks(links: { repo?: string; number: number }[], fallbackRepo: string): Set<string>`
  - `mergePullMeta(pull: DashboardPull, patch: Partial<Pick<DashboardPull, "state" | "labels" | "updated_at">>): DashboardPull`

- [ ] **Step 1: 写失败单测**

```ts
// relatedKeys.test.ts
import { describe, expect, it } from "vitest";
import { relatedKeysFromLinks } from "@/lib/dashboard/relatedKeys";

describe("relatedKeysFromLinks", () => {
  it("uses link repo when present else fallback", () => {
    const set = relatedKeysFromLinks(
      [{ number: 3 }, { repo: "other", number: 4 }],
      "main-repo",
    );
    expect(set.has("main-repo#3")).toBe(true);
    expect(set.has("other#4")).toBe(true);
  });
});
```

```ts
// mergePullMeta.test.ts
import { describe, expect, it } from "vitest";
import { mergePullMeta } from "@/lib/dashboard/mergePullMeta";

describe("mergePullMeta", () => {
  it("patches state labels updated_at only", () => {
    const pull = {
      org: "o",
      repo: "r",
      number: 1,
      title: "t",
      state: "open",
      labels: [],
      user: { login: "u" },
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      html_url: "",
    };
    const next = mergePullMeta(pull, {
      state: "closed",
      labels: [{ name: "x" }],
      updated_at: "2026-04-01T00:00:00Z",
    });
    expect(next.state).toBe("closed");
    expect(next.labels).toEqual([{ name: "x" }]);
    expect(next.title).toBe("t");
  });
});
```

- [ ] **Step 2: 跑测确认失败**

Run: `npm test -- --run tests/dashboard/relatedKeys.test.ts tests/dashboard/mergePullMeta.test.ts`  
Expected: FAIL

- [ ] **Step 3: 实现最小代码**

```ts
// relatedKeys.ts
import { itemKey } from "./itemKey";

export function relatedKeysFromLinks(
  links: { repo?: string; number: number }[],
  fallbackRepo: string,
): Set<string> {
  const set = new Set<string>();
  for (const link of links) {
    const repo = (link.repo?.trim() || fallbackRepo).trim();
    if (!repo || link.number < 1) continue;
    set.add(itemKey(repo, link.number));
  }
  return set;
}
```

```ts
// mergePullMeta.ts
import type { DashboardPull } from "./types";

export function mergePullMeta(
  pull: DashboardPull,
  patch: Partial<Pick<DashboardPull, "state" | "labels" | "updated_at">>,
): DashboardPull {
  return {
    ...pull,
    ...(patch.state != null ? { state: patch.state } : {}),
    ...(patch.labels != null ? { labels: patch.labels } : {}),
    ...(patch.updated_at != null ? { updated_at: patch.updated_at } : {}),
  };
}
```

- [ ] **Step 4: 跑测通过**

Run: `npm test -- --run tests/dashboard/relatedKeys.test.ts tests/dashboard/mergePullMeta.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard tests/dashboard
git commit -m "feat(dashboard): add relatedKeys and mergePullMeta helpers"
```

---

### Task 3: mapDashboardIssue + fetchOrgRepos + fetchOrgUserIssues

**Files:**
- Create: `lib/gitcode/mapDashboardIssue.ts`
- Create: `lib/gitcode/fetchOrgRepos.ts`
- Create: `lib/gitcode/fetchOrgUserIssues.ts`
- Create: `tests/gitcode/mapDashboardIssue.test.ts`
- Modify: `lib/workspace/WorkspaceContext.tsx` — 增加 `commitOrg`

**Interfaces:**
- Produces:
  - `mapDashboardIssue(raw, org): DashboardIssue | null` — `repo` 来自 `raw.repository?.path` 或 `full_name` 的第二段
  - `fetchOrgRepos({ token, org, signal }): Promise<{ name: string; path: string }[]>`
  - `fetchOrgUserIssues({ token, org, state?, sort?, direction?, signal }): Promise<DashboardIssue[]>` — 分页至 `MAX_ISSUES_PAGES`，`filter=created`，`per_page=100`
  - `useWorkspace().commitOrg(org: string): void`

- [ ] **Step 1: 写 mapDashboardIssue 失败单测**

```ts
import { describe, expect, it } from "vitest";
import { mapDashboardIssue } from "@/lib/gitcode/mapDashboardIssue";

describe("mapDashboardIssue", () => {
  it("maps repository.path into repo", () => {
    const issue = mapDashboardIssue(
      {
        number: "9",
        title: "hello",
        state: "opened",
        repository: { path: "e2e-auto-test", full_name: "openFuyao/e2e-auto-test" },
        user: { login: "alice" },
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        html_url: "https://gitcode.com/openFuyao/e2e-auto-test/issues/9",
      },
      "openFuyao",
    );
    expect(issue?.repo).toBe("e2e-auto-test");
    expect(issue?.org).toBe("openFuyao");
    expect(issue?.state).toBe("open");
    expect(issue?.number).toBe(9);
  });

  it("returns null without repo path", () => {
    expect(mapDashboardIssue({ number: 1, title: "x" }, "o")).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测确认失败**

Run: `npm test -- --run tests/gitcode/mapDashboardIssue.test.ts`  
Expected: FAIL

- [ ] **Step 3: 实现 map + fetchers + commitOrg**

`mapDashboardIssue`：可内部调用 `mapGitCodeIssue` 再附加 `org`/`repo`，或独立映射；`state` 的 `opened`→`open` 与现有一致。

`fetchOrgRepos`：

```ts
// GET /orgs/{org}/repos?page=&per_page=100，最多 MAX_ORG_REPOS 条
// 返回 [{ name, path }]，path 优先 raw.path || raw.name
```

`fetchOrgUserIssues`：

```ts
// GET /orgs/{org}/issues
// searchParams: filter=created, state (open|closed|all), sort (created|updated_at), direction, page, per_page=100
// 注意文档 sort 值可能是 updated_at；若 created 失败可试 created_at — 以实测为准，代码里对 sort 做映射：created→created，updated→updated_at
// 循环分页直到空页或 MAX_ISSUES_PAGES
// 401/403 → GitCodeHttpError(401, ...)
```

`WorkspaceContext` 增加：

```ts
const commitOrg = useCallback((nextOrg: string) => {
  commitRepo({ org: nextOrg, repo });
}, [commitRepo, repo]);
```

并放入 context value。

- [ ] **Step 4: 跑测通过**

Run: `npm test -- --run tests/gitcode/mapDashboardIssue.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/gitcode/mapDashboardIssue.ts lib/gitcode/fetchOrgRepos.ts lib/gitcode/fetchOrgUserIssues.ts lib/workspace/WorkspaceContext.tsx tests/gitcode/mapDashboardIssue.test.ts
git commit -m "feat(dashboard): fetch org repos and created issues"
```

---

### Task 4: fetchOrgUserPulls + related + refreshPullMeta

**Files:**
- Create: `lib/gitcode/fetchOrgUserPulls.ts`
- Create: `lib/gitcode/fetchIssueRelatedPulls.ts`
- Create: `lib/gitcode/fetchPullRelatedIssues.ts`
- Create: `lib/gitcode/refreshPullMeta.ts`

**Interfaces:**
- Consumes: `mapGitCodePullItem`, `mapGitCodePull`, `PULL_FETCH_CONCURRENCY`, `MAX_PULL_PAGES_PER_REPO`
- Produces:
  - `fetchOrgUserPulls({ token, org, username, repos: string[], state?, sort?, direction?, signal, onProgress?: (done, total) => void }): Promise<{ items: DashboardPull[]; warnings: string[] }>`
  - `fetchIssueRelatedPulls({ token, org, repo, number, signal }): Promise<{ number: number; title: string; state: string; html_url: string; repo?: string }[]>`
  - `fetchPullRelatedIssues({ token, org, repo, number, signal }): Promise<{ number: number; title?: string; repo?: string }[]>`
  - `refreshPullMeta({ token, org, repo, number, signal }): Promise<Pick<DashboardPull, "state" | "labels" | "updated_at">>`

- [ ] **Step 1: 实现 fetchOrgUserPulls**

对每个 repo：`GET /repos/{org}/{repo}/pulls`，`author=username`，`state`（all/open/closed；merged 若 API 支持则传，否则拉 all 后客户端滤）、`sort`、`direction`、分页至空或 `MAX_PULL_PAGES_PER_REPO`。

并发池大小 `PULL_FETCH_CONCURRENCY`：简单实现可用「分块 Promise.all」。每完成一仓调用 `onProgress`。单仓失败 push 到 `warnings`，继续。结果 map 为 `DashboardPull`（`mapGitCodePullItem` + `org`/`repo`）。

- [ ] **Step 2: 实现关联与刷新**

`fetchIssueRelatedPulls`：抽出 `fetchIssueDetail` 中 pull_requests 请求逻辑（**不要**改坏现有详情；可新建独立函数，详情仍自管）。

`fetchPullRelatedIssues`：`GET .../pulls/{n}/issues`，解析 `number`；若 raw 含 `repository.path` 则带上 `repo`。

`refreshPullMeta`：`GET .../pulls/{n}` → `mapGitCodePullItem` → 返回 `{ state, labels, updated_at }`。

- [ ] **Step 3: 手工类型检查**

Run: `npx tsc --noEmit`（或项目等价命令）  
Expected: 无新增错误

- [ ] **Step 4: Commit**

```bash
git add lib/gitcode/fetchOrgUserPulls.ts lib/gitcode/fetchIssueRelatedPulls.ts lib/gitcode/fetchPullRelatedIssues.ts lib/gitcode/refreshPullMeta.ts
git commit -m "feat(dashboard): fetch pulls, related links, and pull meta refresh"
```

---

### Task 5: 路由、导航、OrgConfirmBar、Repo 筛选、PaneFilters

**Files:**
- Create: `app/dashboard/page.tsx`
- Create: `app/dashboard/page.module.css`（可复制 `app/issues/page.module.css`）
- Modify: `components/shell/ModuleNav.tsx` — 在 Pulls 前或后插入 `{ href: "/dashboard", label: "Dashboard" }`
- Create: `components/dashboard/OrgConfirmBar.tsx` + css
- Create: `components/dashboard/DashboardRepoFilter.tsx`
- Create: `components/dashboard/PaneFilters.tsx` + css
- Create: `components/dashboard/DashboardListItem.tsx` + css

**Interfaces:**
- Consumes: `commitOrg`, `MultiSelect`, `Button`, `TextInput`, `DEFAULT_PANE_FILTERS`
- Produces: 可渲染的壳组件（尚无数据编排）

- [ ] **Step 1: 页面与导航**

`app/dashboard/page.tsx`：

```tsx
"use client";
import { DashboardWorkbench } from "@/components/dashboard/DashboardWorkbench";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <DashboardWorkbench />
    </div>
  );
}
```

先建一个占位 `DashboardWorkbench` 返回 `null` 或简单「加载中」，下一步填满。

ModuleNav 增加 Dashboard 链接。

- [ ] **Step 2: OrgConfirmBar**

仅 org 输入 + 确认，调用 `commitOrg(draftOrg)`；不写 repo。样式对齐 `RepoConfirmBar`。

- [ ] **Step 3: DashboardRepoFilter**

Props：`repos: { path: string; name: string }[]`、`value: "all" | string[]`、`onChange`、`disabled`、`progress?: string | null`。

UI：单选「全部」+ MultiSelect 选仓（选仓时 value 为 string[]）。切换到多选且为空时视为未选——Workbench 应把空多选当「不拉 PR/不展示」或回退全部；**约定：空数组 = 全部**，与「全部」等价，避免死锁。

- [ ] **Step 4: PaneFilters**

状态 MultiSelect（Issue：open/closed；PR：open/closed/merged）、标签 MultiSelect、排序 select、方向 select。变更即 `onChange`。

- [ ] **Step 5: DashboardListItem**

Props：`side`、`item`、`selected`、`related`、`onSelect`、`onRefresh?`、`refreshing?`。

展示 `#n · repo`、标题、状态、标签、时间；外链 `a`（`target=_blank` `rel=noreferrer`）；PR 侧显示刷新按钮。

CSS：`.selected` 用 accent 条；`.related` 用浅底无左边条。

- [ ] **Step 6: Commit**

```bash
git add app/dashboard components/shell/ModuleNav.tsx components/dashboard
git commit -m "feat(dashboard): add route, nav, and filter/list shell UI"
```

---

### Task 6: DashboardWorkbench 数据编排（列表加载）

**Files:**
- Create/Modify: `components/dashboard/DashboardWorkbench.tsx` + `DashboardWorkbench.module.css`
- Create: `components/dashboard/IssuePane.tsx`
- Create: `components/dashboard/PullPane.tsx`

**Interfaces:**
- Consumes: 全部 fetchers、queryLogic、useAuth、useWorkspace

- [ ] **Step 1: Workbench 状态**

```ts
// 关键状态（示意）
boundOrg, orgRepos, repoFilter ("all" | string[])
issueFilters / pullFilters (DEFAULT_PANE_FILTERS)
issueItems / pullItems (原始全量)
issuePage / pullPage
issueLoading / pullLoading / reposLoading
pullProgress / warnings / error
selection / relatedKeys / relatedLoading
pullRefreshingKey (itemKey | null)
```

`workspace` 绑定：`boundOrg !== org` 时批量 reset（filters、pages、items、selection、related、error）。

未登录 / 无 org：EmptyState 提示。

- [ ] **Step 2: 拉仓库列表**

auth+org ready → `fetchOrgRepos`；失败设 error。

- [ ] **Step 3: 拉 Issues**

依赖 org、token、issueFilters.state/sort/direction（服务端），拿到全量后客户端 `filterDashboardItems(..., repoFilter)` + sort + slice。

注意：服务端已按 sort 排时，仓库客户端过滤后需再 `sortDashboardItems`。

标签过滤只客户端。state 若服务端已筛，客户端可再筛一次保持一致。

- [ ] **Step 4: 拉 Pulls**

`repos = repoFilter === "all" ? orgRepos.map(r => r.path) : repoFilter`  
调用 `fetchOrgUserPulls`；merged 状态：请求用 `state=all` 或 `merged`（若支持），客户端用 `state`/`merged_at` 过滤——`filterDashboardItems` 对 PR：若 filters.state 含 `merged`，匹配 `state===merged` 或 `merged_at`。

在 `queryLogic` 若需扩展 PR merged 语义，于本任务补测一条。

- [ ] **Step 5: 布局**

左右两栏各：PaneFilters + 列表 + 分页按钮 + 计数。顶栏：OrgConfirmBar + DashboardRepoFilter + ErrorBanner + warnings。

- [ ] **Step 6: 跑测 + build**

Run: `npm test` ； `npm run build`  
Expected: 全绿；`/dashboard` 静态页生成

- [ ] **Step 7: Commit**

```bash
git add components/dashboard lib/dashboard
git commit -m "feat(dashboard): wire org-wide issue and pull lists"
```

---

### Task 7: 选中、关联高亮、PR 行刷新

**Files:**
- Modify: `components/dashboard/DashboardWorkbench.tsx`
- Modify: `components/dashboard/DashboardListItem.tsx`
- Modify: `components/dashboard/IssuePane.tsx` / `PullPane.tsx`

- [ ] **Step 1: 选中逻辑**

点击行：若已选同一 `itemKey`+side → clear selection + relatedKeys；否则 set selection，`relatedKeys=empty`，发起关联请求（AbortController）。

Issue 选中 → `fetchIssueRelatedPulls` → `relatedKeysFromLinks(..., selection.repo)`。  
PR 选中 → `fetchPullRelatedIssues` → 同上。

列表项：`selected = selection matches`；`related = relatedKeys.has(itemKey(item.repo, item.number)) && !selected`。

- [ ] **Step 2: PR 刷新**

`onRefresh` → `refreshPullMeta` → `setPullItems(items => items.map(merge...))`；`pullRefreshingKey` 控制按钮 loading；失败 setError 或行级 tip（可用 ErrorBanner 短文案）。

- [ ] **Step 3: 验证清单对照**

手动过 Spec §8 条目 1–9（本地 `npm run dev` + Token）。自动化：`npm test`；`npm run build`。

- [ ] **Step 4: Commit**

```bash
git add components/dashboard
git commit -m "feat(dashboard): selection related highlight and PR meta refresh"
```

---

### Task 8: AGENTS.md 与收尾

**Files:**
- Modify: `AGENTS.md` — 目录结构与模块模式补充 Dashboard
- Modify: `README.md` — 若有模块列表则加一行（仅当已有同类列表）

- [ ] **Step 1: 更新 AGENTS.md**

在目录结构与模块模式中增加：

```
app/dashboard/ → DashboardWorkbench
lib/dashboard/ → types、queryLogic、关联/刷新纯函数
```

注明：组织级；PR 按仓聚合；无详情面板。

- [ ] **Step 2: 全量验证**

Run: `npm test` ； `npm run build`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md README.md
git commit -m "docs: note Dashboard module in AGENTS.md"
```

---

## Spec coverage (self-review)

| Spec 要求 | Task |
|-----------|------|
| `/dashboard` 左右对半 | 5–6 |
| 我创建的 Issue/PR | 3–4, 6 |
| 排序 created/updated | 1, 5–6 |
| 状态/标签/仓库筛选 | 1, 5–6 |
| 仓库顶栏共用 | 5–6 |
| PR 行刷新 | 2, 4, 7 |
| 选中关联高亮、不可见静默 | 2, 7 |
| 无详情页 | 5–7 |
| fetchGitCode / 401 / abort | 3–4, 6–7 |
| 测试 + build | 各 task + 8 |

无 TBD 占位；类型名 `DashboardIssue`/`itemKey`/`relatedKeysFromLinks`/`mergePullMeta` 前后一致。
